from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.models import PurchaseOrders, Products, Users
from app.schemas.purchase_order import PurchaseOrderResponse

router = APIRouter()

@router.get("/", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """
    Retrieve all purchase orders with associated product names and SKUs.
    """
    results = db.query(
        PurchaseOrders,
        Products.product_name,
        Products.sku
    ).outerjoin(Products, PurchaseOrders.product_id == Products.product_id)\
     .order_by(PurchaseOrders.created_at.desc()).all()

    response = []
    for po, product_name, sku in results:
        po_dict = {
            "order_id": po.order_id,
            "product_id": po.product_id,
            "order_quantity": po.order_quantity,
            "status": po.status,
            "created_at": po.created_at,
            "product_name": product_name,
            "sku": sku
        }
        response.append(PurchaseOrderResponse(**po_dict))
    
    return response

@router.patch("/{order_id}/status", response_model=PurchaseOrderResponse)
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """
    Update the status of a purchase order (e.g., Scheduled, Completed, Cancelled).
    """
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    order.status = status
    db.commit()
    db.refresh(order)
    
    # Need to return with product info
    product = db.query(Products).filter(Products.product_id == order.product_id).first()
    
    po_dict = {
        "order_id": order.order_id,
        "product_id": order.product_id,
        "order_quantity": order.order_quantity,
        "status": order.status,
        "created_at": order.created_at,
        "product_name": product.product_name if product else None,
        "sku": product.sku if product else None
    }
    
    return PurchaseOrderResponse(**po_dict)
