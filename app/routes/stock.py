from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.models import Products, Inventory, StockTransactions, Alerts, Users
from app.schemas.stock import TransactionCreate, InventoryResponse, TransactionResponse
from app.core.dependencies import get_db, get_current_user

router = APIRouter()

@router.post("/transaction", response_model=dict)
def create_transaction(
    transaction_in: TransactionCreate, 
    db: Session = Depends(get_db), 
    current_user: Users = Depends(get_current_user)
):
    if transaction_in.type not in ["IN", "OUT"]:
        raise HTTPException(status_code=400, detail="Transaction type must be IN or OUT")
        
    if transaction_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
        
    inv = db.query(Inventory).filter(Inventory.product_id == transaction_in.product_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory record not found for product")
        
    if transaction_in.type == "OUT" and inv.current_stock - transaction_in.quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for OUT transaction")
        
    # Create transaction
    new_tx = StockTransactions(
        product_id=transaction_in.product_id,
        user_id=current_user.user_id,
        quantity=transaction_in.quantity,
        type=transaction_in.type,
        source=transaction_in.source
    )
    db.add(new_tx)
    
    # Update inventory
    if transaction_in.type == "IN":
        inv.current_stock += transaction_in.quantity
    else:
        inv.current_stock -= transaction_in.quantity
    inv.last_updated = func.now()
    
    # Check for alerts
    if inv.current_stock < inv.min_stock:
        existing_alert = db.query(Alerts).filter(
            Alerts.product_id == transaction_in.product_id,
            Alerts.is_resolved == 0,
            Alerts.alert_type == "LOW"
        ).first()
        
        if not existing_alert:
            new_alert = Alerts(
                product_id=transaction_in.product_id,
                alert_type="LOW",
                message=f"Low stock alert: {inv.current_stock} remaining (Min: {inv.min_stock})",
                is_resolved=0
            )
            db.add(new_alert)
            
    db.commit()
    db.refresh(new_tx)
    
    return {
        "success": True,
        "data": TransactionResponse.model_validate(new_tx).model_dump(),
        "message": "Stock transaction completed successfully"
    }

@router.get("/", response_model=dict)
def get_inventory(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    results = db.query(Inventory, Products).join(Products, Inventory.product_id == Products.product_id).all()
    
    data = []
    for inv, prod in results:
        data.append({
            "product_id": inv.product_id,
            "product_name": prod.product_name,
            "sku": prod.sku,
            "current_stock": inv.current_stock,
            "min_stock": inv.min_stock,
            "max_stock": inv.max_stock,
            "last_updated": inv.last_updated
        })
        
    return {
        "success": True,
        "data": data,
        "message": "Inventory retrieved successfully"
    }

@router.get("/{product_id}", response_model=dict)
def get_product_inventory(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    result = db.query(Inventory, Products).join(Products, Inventory.product_id == Products.product_id).filter(Inventory.product_id == product_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Inventory record not found")
        
    inv, prod = result
    data = {
        "product_id": inv.product_id,
        "product_name": prod.product_name,
        "sku": prod.sku,
        "current_stock": inv.current_stock,
        "min_stock": inv.min_stock,
        "max_stock": inv.max_stock,
        "last_updated": inv.last_updated
    }
    
    return {
        "success": True,
        "data": data,
        "message": "Inventory details retrieved successfully"
    }

@router.get("/{product_id}/history", response_model=dict)
def get_stock_history(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    transactions = db.query(StockTransactions).filter(StockTransactions.product_id == product_id).order_by(StockTransactions.timestamp.desc()).all()
    data = [TransactionResponse.model_validate(tx).model_dump() for tx in transactions]
    
    return {
        "success": True,
        "data": data,
        "message": "Stock history retrieved successfully"
    }
