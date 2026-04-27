from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Products, Inventory, StockTransactions, Alerts, Categories, Users
from app.schemas.dashboard import DashboardResponse
from app.core.dependencies import get_db, get_current_user

router = APIRouter()

@router.get("/", response_model=dict)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    total_products = db.query(func.count(Products.product_id)).scalar() or 0
    total_categories = db.query(func.count(Categories.category_id)).scalar() or 0
    
    val_query = db.query(func.sum(Inventory.current_stock * Products.unit_price)).join(Products, Inventory.product_id == Products.product_id).scalar()
    total_inventory_value = float(val_query) if val_query else 0.0
    
    low_stock_count = db.query(func.count(Inventory.product_id)).filter(Inventory.current_stock < Inventory.min_stock).scalar() or 0
    out_of_stock_count = db.query(func.count(Inventory.product_id)).filter(Inventory.current_stock == 0).scalar() or 0
    
    active_alerts = db.query(func.count(Alerts.id)).filter(Alerts.is_resolved == 0).scalar() or 0
    
    recent_txs_raw = db.query(StockTransactions, Products).join(Products, StockTransactions.product_id == Products.product_id).order_by(StockTransactions.timestamp.desc()).limit(10).all()
    recent_transactions = [
        {
            "transaction_id": tx.transaction_id,
            "product_name": prod.product_name,
            "sku": prod.sku,
            "quantity": tx.quantity,
            "type": tx.type,
            "timestamp": tx.timestamp
        }
        for tx, prod in recent_txs_raw
    ]
    
    low_stock_raw = db.query(Inventory, Products).join(Products, Inventory.product_id == Products.product_id).filter(Inventory.current_stock < Inventory.min_stock).all()
    low_stock_items = [
        {
            "product_id": inv.product_id,
            "product_name": prod.product_name,
            "sku": prod.sku,
            "current_stock": inv.current_stock,
            "min_stock": inv.min_stock
        }
        for inv, prod in low_stock_raw
    ]
    
    data = {
        "total_products": total_products,
        "total_inventory_value": total_inventory_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "active_alerts": active_alerts,
        "total_categories": total_categories,
        "recent_transactions": recent_transactions,
        "low_stock_items": low_stock_items
    }
    
    # Optional: validate through Pydantic model
    validated_data = DashboardResponse.model_validate(data).model_dump()
    
    return {
        "success": True,
        "data": validated_data,
        "message": "Dashboard data retrieved successfully"
    }
