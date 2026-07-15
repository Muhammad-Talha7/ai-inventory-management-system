from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import case, cast, Date

from app.core.dependencies import get_db, require_role
from app.core.audit import log_audit
from app.models import PurchaseOrders, PurchaseOrderItems, Products, Users, Inventory, StockTransactions, Alerts
from app.schemas.purchase_order import PurchaseOrderResponse, ManualOrderCreate

router = APIRouter()

@router.get("/", response_model=dict)
def get_purchase_orders(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor")),
):
    query = db.query(PurchaseOrders)

    if current_user.role == "staff":
        query = query.filter(PurchaseOrders.status != "Cancelled")

    today = datetime.now().date()
    this_monday = today - timedelta(days=today.weekday())
    target_monday = this_monday - timedelta(weeks=(page - 1))
    target_sunday = target_monday + timedelta(days=6)

    query = query.filter(cast(PurchaseOrders.created_at, Date) >= target_monday)
    query = query.filter(cast(PurchaseOrders.created_at, Date) <= target_sunday)

    status_order = case(
        (PurchaseOrders.status == 'Pending Approval', 1),
        (PurchaseOrders.status == 'Scheduled', 2),
        (PurchaseOrders.status == 'Completed', 3),
        (PurchaseOrders.status == 'Rejected', 4),
        (PurchaseOrders.status == 'Cancelled', 5),
        else_=6
    )

    results = query.order_by(status_order, PurchaseOrders.created_at.desc()).all()

    has_more_query = db.query(PurchaseOrders)
    if current_user.role == "staff":
        has_more_query = has_more_query.filter(PurchaseOrders.status != "Cancelled")
    has_more_query = has_more_query.filter(cast(PurchaseOrders.created_at, Date) < target_monday)
    has_more = db.query(has_more_query.exists()).scalar()

    data = []
    for po in results:
        items = db.query(PurchaseOrderItems, Products.product_name, Products.sku).join(Products, PurchaseOrderItems.product_id == Products.product_id).filter(PurchaseOrderItems.order_id == po.order_id).all()
        
        item_list = []
        for item, product_name, sku in items:
            item_list.append({
                "id": item.id,
                "order_id": item.order_id,
                "product_id": item.product_id,
                "order_quantity": item.order_quantity,
                "received_quantity": item.received_quantity,
                "product_name": product_name,
                "sku": sku
            })
            
        po_dict = {
            "order_id": po.order_id,
            "status": po.status,
            "created_at": po.created_at,
            "approved_by": po.approved_by,
            "approved_at": po.approved_at,
            "rejected_by": po.rejected_by,
            "received_by": po.received_by,
            "received_at": po.received_at,
            "receiving_notes": po.receiving_notes,
            "items": item_list
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
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if status not in ["Cancelled", "Scheduled"]:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    order.status = status
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="update_status",
        entity_type="purchase_order",
        entity_id=order.order_id,
        new_values={"status": status}
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Purchase order status updated successfully",
    }

from pydantic import BaseModel

class POReceiveItem(BaseModel):
    id: int
    received_quantity: int

class POReceive(BaseModel):
    items: List[POReceiveItem]
    receiving_notes: Optional[str] = None

@router.post("/{order_id}/receive", response_model=dict)
def receive_purchase_order(
    order_id: int,
    receive_data: POReceive,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff")),
):
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    if order.status != "Scheduled":
        raise HTTPException(status_code=400, detail="Only Scheduled orders can be received")

    for item_in in receive_data.items:
        db_item = db.query(PurchaseOrderItems).filter(PurchaseOrderItems.id == item_in.id, PurchaseOrderItems.order_id == order_id).first()
        if db_item:
            db_item.received_quantity = item_in.received_quantity
            
    order.receiving_notes = receive_data.receiving_notes
    order.received_by = current_user.user_id
    order.received_at = datetime.utcnow()
    order.status = "Pending Approval"
    
    alert = Alerts(
        product_id=None, # General alert for PO
        alert_type="PO_RECEIVED",
        target_role="manager",
        message=f"Purchase Order #{order.order_id} has been received by staff and needs your approval.",
        is_resolved=0
    )
    db.add(alert)
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="receive",
        entity_type="purchase_order",
        entity_id=order.order_id,
        new_values={
            "status": "Pending Approval",
            "receiving_notes": receive_data.receiving_notes
        }
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Purchase order marked as received and pending approval"
    }


@router.post("/{order_id}/approve", response_model=dict)
def approve_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if order.status != "Pending Approval":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve order with status '{order.status}'. Must be 'Pending Approval'.",
        )

    if order.received_by == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot approve a purchase order that you received yourself.",
        )

    order.status = "Completed"
    order.approved_by = current_user.user_id
    order.approved_at = datetime.utcnow()
    
    items = db.query(PurchaseOrderItems).filter(PurchaseOrderItems.order_id == order_id).all()
    for item in items:
        inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
        if inv and item.received_quantity is not None:
            inv.current_stock += item.received_quantity
            
            tx = StockTransactions(
                product_id=item.product_id,
                user_id=order.received_by,
                quantity=item.received_quantity,
                type="IN",
                source="Purchase Order",
                status="approved",
                approved_by=current_user.user_id,
                approved_at=datetime.utcnow(),
                reason=f"Received PO #{order.order_id}"
            )
            db.add(tx)

    alert = Alerts(
        product_id=None,
        alert_type="PO_APPROVED",
        target_role="staff",
        message=f"Purchase Order #{order.order_id} has been approved and stock updated.",
        is_resolved=0
    )
    db.add(alert)
    
    existing_alert = db.query(Alerts).filter(
        Alerts.message.like(f"%Purchase Order #{order.order_id}%"),
        Alerts.alert_type == "PO_RECEIVED",
        Alerts.is_resolved == 0
    ).first()
    if existing_alert:
        existing_alert.is_resolved = 1
        existing_alert.resolved_by = current_user.user_id
        existing_alert.resolved_at = datetime.utcnow()

    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="approve",
        entity_type="purchase_order",
        entity_id=order.order_id,
        new_values={"status": "Completed"}
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Purchase order approved",
    }


class POReject(BaseModel):
    reason: str

@router.post("/{order_id}/reject", response_model=dict)
def reject_purchase_order(
    order_id: int,
    reject_data: POReject,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(PurchaseOrders).filter(PurchaseOrders.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if order.status not in ["Scheduled", "Pending Approval"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject order with status '{order.status}'",
        )

    order.status = "Rejected"
    order.rejected_by = current_user.user_id
    
    alert = Alerts(
        product_id=None,
        alert_type="PO_REJECTED",
        target_role="staff",
        message=f"Purchase Order #{order.order_id} has been rejected. Reason: {reject_data.reason}",
        is_resolved=0
    )
    db.add(alert)
    
    if order.status == "Pending Approval":
        existing_alert = db.query(Alerts).filter(
            Alerts.message.like(f"%Purchase Order #{order.order_id}%"),
            Alerts.alert_type == "PO_RECEIVED",
            Alerts.is_resolved == 0
        ).first()
        if existing_alert:
            existing_alert.is_resolved = 1
            existing_alert.resolved_by = current_user.user_id
            existing_alert.resolved_at = datetime.utcnow()
            
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="reject",
        entity_type="purchase_order",
        entity_id=order.order_id,
        new_values={"status": "Rejected", "reason": reject_data.reason}
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Purchase order rejected",
    }


@router.post("/manual", response_model=dict)
def create_manual_order(
    order_in: ManualOrderCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    if not order_in.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
        
    for item in order_in.items:
        if item.order_quantity <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be > 0 for all items")
        product = db.query(Products).filter(Products.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

    new_order = PurchaseOrders(status="Scheduled")
    db.add(new_order)
    db.flush()
    
    for item in order_in.items:
        po_item = PurchaseOrderItems(
            order_id=new_order.order_id,
            product_id=item.product_id,
            order_quantity=item.order_quantity
        )
        db.add(po_item)
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="create_manual",
        entity_type="purchase_order",
        entity_id=new_order.order_id,
        new_values={"item_count": len(order_in.items)}
    )
    db.commit()
    db.refresh(new_order)

    return {
        "success": True,
        "message": "Manual purchase order created successfully"
    }
