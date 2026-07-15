import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import engine, Base, SessionLocal
from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.products import router as products_router
from app.routes.stock import router as stock_router
from app.routes.alerts import router as alerts_router
from app.routes.dashboard import router as dashboard_router
from app.routes.forecast import router as forecast_router
from app.routes.auto_order_router import router as auto_order_router
from app.routes.purchase_orders import router as purchase_orders_router
from app.routes.audit_logs import router as audit_logs_router
from app.routes.suppliers import router as suppliers_router
from app.models import Users, PurchaseOrders, Alerts
from app.core.security import get_password_hash
from app.ai.forecasting import load_model, train_model
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

app = FastAPI()
security = HTTPBearer()

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    if "paths" in openapi_schema:
        for path in openapi_schema["paths"].values():
            for method in path.values():
                method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Create tables
Base.metadata.create_all(bind=engine)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(categories_router, prefix="/categories", tags=["categories"])
app.include_router(products_router, prefix="/products", tags=["products"])
app.include_router(stock_router, prefix="/stock", tags=["stock"])
app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
app.include_router(forecast_router, prefix="/forecast", tags=["forecast"])
app.include_router(auto_order_router, prefix="/api/forecast", tags=["auto-order"])
app.include_router(purchase_orders_router, prefix="/purchase-orders", tags=["purchase-orders"])
app.include_router(audit_logs_router, prefix="/audit-logs", tags=["audit-logs"])
app.include_router(suppliers_router, prefix="/suppliers", tags=["suppliers"])

# Seed admin user on startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        admin_user = db.query(Users).filter(Users.email == "admin@warehouse.com").first()
        if not admin_user:
            hashed_password = get_password_hash("admin123")
            new_admin = Users(
                name="Admin",
                email="admin@warehouse.com",
                password_hash=hashed_password,
                role="admin"
            )
            db.add(new_admin)
            db.commit()
    finally:
        db.close()

    # Load forecast model if it exists, otherwise warn
    if load_model():
        logger.info("Forecast model loaded into memory.")
    else:
        logger.warning("Model not found. Hit POST /forecast/train to train.")

    # Schedule monthly retraining on the 1st of every month at midnight
    scheduler.add_job(
        train_model,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_retrain",
        replace_existing=True,
    )

    def check_overdue_pos():
        """Check for Scheduled POs older than 14 days and alert managers."""
        db = SessionLocal()
        try:
            fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
            overdue_pos = db.query(PurchaseOrders).filter(
                PurchaseOrders.status == "Scheduled",
                PurchaseOrders.created_at <= fourteen_days_ago
            ).all()

            for po in overdue_pos:
                # Check if alert already exists to prevent spam
                existing_alert = db.query(Alerts).filter(
                    Alerts.product_id == po.product_id,
                    Alerts.alert_type == "PO_OVERDUE",
                    Alerts.is_resolved == 0,
                    Alerts.message.like(f"%{po.order_id}%")
                ).first()

                if not existing_alert:
                    new_alert = Alerts(
                        product_id=po.product_id,
                        alert_type="PO_OVERDUE",
                        target_role="manager",
                        message=f"Purchase Order #{po.order_id} is overdue. Expected delivery was 14+ days ago.",
                        is_resolved=0
                    )
                    db.add(new_alert)
            db.commit()
        except Exception as e:
            logger.error(f"Error checking overdue POs: {e}")
        finally:
            db.close()

    # Check for overdue POs daily at 8:00 AM
    scheduler.add_job(
        check_overdue_pos,
        trigger=CronTrigger(hour=8, minute=0),
        id="daily_overdue_po_check",
        replace_existing=True,
    )

    scheduler.start()
    # Run the check once on startup just in case
    scheduler.add_job(check_overdue_pos)
    logger.info("APScheduler started — cron jobs scheduled.")


@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown(wait=False)
    logger.info("APScheduler shut down.")

@app.get("/")
def root():
    return {"message": "Warehouse API running"}