from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from app.database import engine, Base, SessionLocal
from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.products import router as products_router
from app.routes.stock import router as stock_router
from app.routes.alerts import router as alerts_router
from app.routes.dashboard import router as dashboard_router
from app.models import Users
from app.core.security import get_password_hash

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
    allow_origins=["http://localhost:3000"],
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

@app.get("/")
def root():
    return {"message": "Warehouse API running"}