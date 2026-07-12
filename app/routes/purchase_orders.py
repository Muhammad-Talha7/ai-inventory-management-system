from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.core.dependencies import get_db, require_role
from app.models import PurchaseOrders, Products, Users, Inventory, StockTransactions, Alerts
from app.schemas.purchase_order import PurchaseOrderResponse

router = APIRouter()


@router.get("/", response_model=dict)
def get_purchase_orders(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    """
    Retrieve all purchase orders with associated product names and SKUs.
    """
    query = db.query(
        PurchaseOrders,
        Products.product_name,
        Products.sku
    ).outerjoin(Products, PurchaseOrders.product_id == Products.product_id)

    if current_user.role == "staff":
        query = query.filter(PurchaseOrders.status != "Cancelled")

    # Date calculations for weekly pagination
    # page=1 is current calendar week (Mon-Sun), page=2 is previous week, etc.
    from sqlalchemy import case, cast, Date
    today = datetime.now().date()
    this_monday = today - timedelta(days=today.weekday())
    target_monday = this_monday - timedelta(weeks=(page - 1))
    target_sunday = target_monday + timedelta(days=6)

    query = query.filter(cast(PurchaseOrders.created_at, Date) >= target_monday)
    query = query.filter(cast(PurchaseOrders.created_at, Date) <= target_sunday)

    # Custom Status Sorting
    status_order = case(
        (PurchaseOrders.status == 'Pending Approval', 1),
        (PurchaseOrders.status == 'Scheduled', 2),
        (PurchaseOrders.status == 'Completed', 3),
        (PurchaseOrders.status == 'Cancelled', 4),
        else_=5
    )

    results = query.order_by(status_order, PurchaseOrders.created_at.desc()).all()

    # Check if more history exists
    has_more_query = db.query(PurchaseOrders)
    if current_user.role == "staff":
        has_more_query = has_more_query.filter(PurchaseOrders.status != "Cancelled")
    has_more_query = has_more_query.filter(cast(PurchaseOrders.created_at, Date) < target_monday)
    has_more = db.query(has_more_query.exists()).scalar()

    data = []
    for po, product_name, sku in results:
        po_dict = {
            "order_id": po.order_id,
            "product_id": po.product_id,
            "order_quantity": po.order_quantity,
            "status": po.status,
            "created_at": po.created_at,
            "product_name": product_name,
            "sku": sku,
            "approved_by": po.approved_by,
            "approved_at": po.approved_at,
            "rejected_by": po.rejected_by,
        }
        data.append(PurchaseOrderResponse(**po_dict).model_dump())

    return {
        "success": True,
        "data": data,
        "has_more": has_more,
        "week_label": f"Week of {target_monday.strftime('%b %d')} - {target_sunday.strftime('%b %d')}",
        "message": "Purchase orders retrieved successfully",
    }


@router.patch("/{order_id}/status", response_model=dict)
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    """
    Update the status of a purchase order (e.g., Scheduled, Pending Approval, Completed, Cancelled).
    """
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    # Staff restrictions
    if current_user.role == "staff":
        if status not in ["Pending Approval"]:
            raise HTTPException(status_code=403, detail="Staff can only mark orders as Pending Approval")
    
    # Manager & Admin restrictions
    if current_user.role in ["manager", "admin"]:
        if current_user.role == "admin" and status in ["Completed", "Cancelled"]:
            raise HTTPException(status_code=403, detail="Admin cannot approve or cancel orders")
        if status not in ["Completed", "Cancelled", "Scheduled", "Pending Approval"]:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if status == "Pending Approval" and order.status != "Pending Approval":
        # Staff marking order as received. Create alert for manager.
        alert = Alerts(
            product_id=order.product_id,
            alert_type="PO_RECEIVED",
            target_role="manager",
            message=f"Purchase Order #{order.order_id} has been received by staff and needs your approval.",
            is_resolved=0
        )
        db.add(alert)

    if status == "Completed" and order.status != "Completed":
        inv = db.query(Inventory).filter(Inventory.product_id == order.product_id).first()
        if inv:
            inv.current_stock += order.order_quantity
            
            # Record the transaction
            tx = StockTransactions(
                product_id=order.product_id,
                user_id=current_user.user_id,
                quantity=order.order_quantity,
                type="IN",
                source="Purchase Order",
                status="approved",
                approved_by=current_user.user_id,
                approved_at=datetime.utcnow(),
                reason=f"Received PO #{order.order_id}"
            )
            db.add(tx)
            
        # Manager marking order as completed. Create alert for staff.
        alert = Alerts(
            product_id=order.product_id,
            alert_type="PO_APPROVED",
            target_role="staff",
            message=f"Purchase Order #{order.order_id} has been approved and stock updated.",
            is_resolved=0
        )
        db.add(alert)
        
        # Also resolve the PO_RECEIVED alert if it exists
        existing_alert = db.query(Alerts).filter(
            Alerts.product_id == order.product_id,
            Alerts.alert_type == "PO_RECEIVED",
            Alerts.is_resolved == 0
        ).first()
        if existing_alert:
            existing_alert.is_resolved = 1
            existing_alert.resolved_by = current_user.user_id
            existing_alert.resolved_at = datetime.utcnow()

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
        "sku": product.sku if product else None,
        "approved_by": order.approved_by,
        "approved_at": order.approved_at,
        "rejected_by": order.rejected_by,
    }

    return {
        "success": True,
        "data": PurchaseOrderResponse(**po_dict).model_dump(),
        "message": "Purchase order status updated successfully",
    }


@router.post("/{order_id}/approve", response_model=dict)
def approve_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager", "admin")),
):
    """Manager or admin approves an AI-generated purchase order."""
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if order.status not in ("Scheduled",):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve order with status '{order.status}'",
        )

    order.status = "Approved"
    order.approved_by = current_user.user_id
    order.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    product = db.query(Products).filter(Products.product_id == order.product_id).first()

    return {
        "success": True,
        "data": {
            "order_id": order.order_id,
            "product_id": order.product_id,
            "product_name": product.product_name if product else None,
            "order_quantity": order.order_quantity,
            "status": order.status,
            "approved_by": order.approved_by,
            "approved_at": order.approved_at,
        },
        "message": "Purchase order approved",
    }


@router.post("/{order_id}/reject", response_model=dict)
def reject_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager", "admin")),
):
    """Manager or admin rejects an AI-generated purchase order."""
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if order.status not in ("Scheduled",):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject order with status '{order.status}'",
        )

    order.status = "Rejected"
    order.rejected_by = current_user.user_id
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "data": {
            "order_id": order.order_id,
            "status": order.status,
            "rejected_by": order.rejected_by,
        },
        "message": "Purchase order rejected",
    }


from pydantic import BaseModel
class ManualOrderCreate(BaseModel):
    product_id: str
    order_quantity: int

@router.post("/manual", response_model=dict)
def create_manual_order(
    order_in: ManualOrderCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager", "admin")),
):
    """Manager or admin manually creates a purchase order."""
    if order_in.order_quantity <= 0:
        raise HTTPException(status_code=400, detail="Order quantity must be > 0")
        
    product = db.query(Products).filter(Products.product_id == order_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_order = PurchaseOrders(
        product_id=order_in.product_id,
        order_quantity=order_in.order_quantity,
        status="Scheduled"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return {
        "success": True,
        "data": {
            "order_id": new_order.order_id,
            "product_id": new_order.product_id,
            "product_name": product.product_name,
            "order_quantity": new_order.order_quantity,
            "status": new_order.status
        },
        "message": "Manual purchase order created successfully"
    }
