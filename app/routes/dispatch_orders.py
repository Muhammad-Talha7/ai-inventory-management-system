from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.dependencies import get_db, require_role
from app.core.audit import log_audit
from app.models import DispatchOrders, DispatchOrderItems, Products, Users, Inventory, StockTransactions, Alerts

router = APIRouter()

# In-memory temporary store for CV scanner SO (Dispatch) receiving session
# Maps sku -> quantity
SO_SCAN_SESSION: dict[str, int] = {}

class SOScanItem(BaseModel):
    sku: str
    quantity: int = 1

@router.post("/scan-session")
def add_to_scan_session(scan: SOScanItem):
    """CV module posts here when in SO (Dispatch) mode."""
    SO_SCAN_SESSION[scan.sku] = SO_SCAN_SESSION.get(scan.sku, 0) + scan.quantity
    return {"success": True, "scanned_total": sum(SO_SCAN_SESSION.values())}

@router.get("/scan-session")
def get_scan_session(current_user: Users = Depends(require_role("staff", "manager"))):
    """Frontend polls this to see the live tally of scanned items for dispatch."""
    items = [{"sku": sku, "quantity": qty} for sku, qty in SO_SCAN_SESSION.items()]
    return {"success": True, "data": items, "total": sum(SO_SCAN_SESSION.values())}

@router.delete("/scan-session")
def clear_scan_session(current_user: Users = Depends(require_role("staff", "manager"))):
    """Clear the session after a successful SO match and submit, or to reset."""
    SO_SCAN_SESSION.clear()
    return {"success": True}

@router.get("/", response_model=dict)
def get_dispatch_orders(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor")),
):
    query = db.query(DispatchOrders)

    if current_user.role == "staff":
        query = query.filter(DispatchOrders.status != "Cancelled")

    total = query.count()
    limit = 50
    offset = (page - 1) * limit
    orders = query.order_by(DispatchOrders.created_at.desc()).offset(offset).limit(limit).all()

    data = []
    for order in orders:
        items = db.query(DispatchOrderItems).filter(DispatchOrderItems.dispatch_id == order.dispatch_id).all()
        items_data = []
        for item in items:
            prod = db.query(Products).filter(Products.product_id == item.product_id).first()
            if prod:
                items_data.append({
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": prod.product_name,
                    "sku": prod.sku,
                    "order_quantity": item.order_quantity,
                    "dispatched_quantity": item.dispatched_quantity,
                })

        data.append({
            "dispatch_id": order.dispatch_id,
            "status": order.status,
            "destination": order.destination,
            "created_at": order.created_at,
            "created_by": order.created_by,
            "approved_by": order.approved_by,
            "items": items_data,
            "dispatching_notes": order.dispatching_notes
        })

    return {
        "success": True,
        "data": data,
        "total": total,
        "page": page,
        "has_more": offset + limit < total,
    }

class DispatchItemUpdate(BaseModel):
    product_id: str
    order_quantity: int

class ManualDispatchCreate(BaseModel):
    destination: str
    items: List[DispatchItemUpdate]

@router.post("/manual", response_model=dict)
def create_manual_dispatch(
    dispatch_in: ManualDispatchCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    if not dispatch_in.items:
        raise HTTPException(status_code=400, detail="Dispatch order must have at least one item")
        
    for item in dispatch_in.items:
        if item.order_quantity <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be > 0 for all items")
        product = db.query(Products).filter(Products.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

    new_order = DispatchOrders(status="Scheduled", destination=dispatch_in.destination, created_by=current_user.user_id)
    db.add(new_order)
    db.flush()
    
    for item in dispatch_in.items:
        do_item = DispatchOrderItems(
            dispatch_id=new_order.dispatch_id,
            product_id=item.product_id,
            order_quantity=item.order_quantity
        )
        db.add(do_item)
    
    alert = Alerts(
        product_id=None,
        alert_type="DO_CREATED",
        target_role="staff",
        message=f"New Dispatch Order #{new_order.dispatch_id} has been created and scheduled for {dispatch_in.destination}.",
        is_resolved=0
    )
    db.add(alert)

    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="create_manual",
        entity_type="dispatch_order",
        entity_id=new_order.dispatch_id,
        new_values={"item_count": len(dispatch_in.items), "destination": dispatch_in.destination}
    )
    db.commit()
    db.refresh(new_order)

    return {
        "success": True,
        "message": "Dispatch order created successfully"
    }

class DODispatchItem(BaseModel):
    id: int
    dispatched_quantity: int

class DODispatch(BaseModel):
    items: List[DODispatchItem]
    dispatching_notes: Optional[str] = None

@router.post("/{dispatch_id}/dispatch", response_model=dict)
def dispatch_order(
    dispatch_id: int,
    dispatch_data: DODispatch,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff")),
):
    order = db.query(DispatchOrders).filter(DispatchOrders.dispatch_id == dispatch_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Dispatch order not found")
        
    if order.status != "Scheduled":
        raise HTTPException(status_code=400, detail="Only Scheduled orders can be dispatched")

    has_discrepancy = False
    for item_in in dispatch_data.items:
        db_item = db.query(DispatchOrderItems).filter(DispatchOrderItems.id == item_in.id, DispatchOrderItems.dispatch_id == dispatch_id).first()
        if db_item:
            db_item.dispatched_quantity = item_in.dispatched_quantity
            if db_item.dispatched_quantity != db_item.order_quantity:
                has_discrepancy = True
            
    order.dispatching_notes = dispatch_data.dispatching_notes
    order.dispatched_by = current_user.user_id
    order.dispatched_at = datetime.utcnow()
    order.status = "Pending Approval"
    
    if has_discrepancy:
        msg = f"Dispatch Order #{order.dispatch_id} dispatched with discrepancies. Reason: {dispatch_data.dispatching_notes or 'No notes'}. Needs approval."
    else:
        msg = f"Dispatch Order #{order.dispatch_id} dispatched successfully (no discrepancies). Needs approval."
    
    alert = Alerts(
        product_id=None,
        alert_type="DO_DISPATCHED",
        target_role="manager",
        message=msg,
        is_resolved=0
    )
    db.add(alert)
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="dispatch",
        entity_type="dispatch_order",
        entity_id=order.dispatch_id,
        new_values={
            "status": "Pending Approval",
            "dispatching_notes": dispatch_data.dispatching_notes
        }
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Dispatch order marked as dispatched and pending approval"
    }

@router.post("/{dispatch_id}/approve", response_model=dict)
def approve_dispatch_order(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(DispatchOrders).filter(DispatchOrders.dispatch_id == dispatch_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Dispatch order not found")

    if order.status != "Pending Approval":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve order with status '{order.status}'. Must be 'Pending Approval'.",
        )

    if order.dispatched_by == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot approve a dispatch order that you dispatched yourself.",
        )

    items = db.query(DispatchOrderItems).filter(DispatchOrderItems.dispatch_id == dispatch_id).all()
    
    # Pre-check for insufficient stock
    shortages = []
    for item in items:
        inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
        qty = item.dispatched_quantity or 0
        if not inv or (inv.current_stock - qty < 0):
            shortages.append(item.product_id)
            
    if shortages:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve dispatch. Insufficient stock for products: {', '.join(shortages)}"
        )

    order.status = "Completed"
    order.approved_by = current_user.user_id
    order.approved_at = datetime.utcnow()
    
    for item in items:
        inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).first()
        qty = item.dispatched_quantity or 0
        if inv and qty > 0:
            inv.current_stock -= qty
            
            tx = StockTransactions(
                product_id=item.product_id,
                user_id=order.dispatched_by,
                quantity=qty,
                type="OUT",
                source="Dispatch Order",
                status="approved",
                approved_by=current_user.user_id,
                approved_at=datetime.utcnow(),
                reason=f"Dispatched DO #{order.dispatch_id}"
            )
            db.add(tx)
            
            # Low stock alert check
            if inv.current_stock < inv.min_stock:
                existing_alert = db.query(Alerts).filter(
                    Alerts.product_id == item.product_id,
                    Alerts.is_resolved == 0,
                    Alerts.alert_type == "LOW_STOCK",
                ).first()
                if not existing_alert:
                    db.add(Alerts(
                        product_id=item.product_id,
                        alert_type="LOW_STOCK",
                        target_role="manager",
                        message=f"Low stock alert: {inv.current_stock} remaining (Min: {inv.min_stock})",
                        is_resolved=0,
                    ))

    alert = Alerts(
        product_id=None,
        alert_type="DO_APPROVED",
        target_role="staff",
        message=f"Dispatch Order #{order.dispatch_id} has been approved and stock updated.",
        is_resolved=0
    )
    db.add(alert)
    
    existing_alert = db.query(Alerts).filter(
        Alerts.message.like(f"%Dispatch Order #{order.dispatch_id}%"),
        Alerts.alert_type == "DO_DISPATCHED",
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
        entity_type="dispatch_order",
        entity_id=order.dispatch_id,
        new_values={"status": "Completed"}
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Dispatch order approved",
    }

class DOReject(BaseModel):
    reason: str

@router.post("/{dispatch_id}/reject", response_model=dict)
def reject_dispatch_order(
    dispatch_id: int,
    reject_data: DOReject,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(DispatchOrders).filter(DispatchOrders.dispatch_id == dispatch_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Dispatch order not found")

    if order.status not in ["Scheduled", "Pending Approval"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject order with status '{order.status}'",
        )

    order.status = "Rejected"
    order.rejected_by = current_user.user_id
    
    alert = Alerts(
        product_id=None,
        alert_type="DO_REJECTED",
        target_role="staff",
        message=f"Dispatch Order #{order.dispatch_id} has been rejected. Reason: {reject_data.reason}",
        is_resolved=0
    )
    db.add(alert)
    
    if order.status == "Pending Approval":
        existing_alert = db.query(Alerts).filter(
            Alerts.message.like(f"%Dispatch Order #{order.dispatch_id}%"),
            Alerts.alert_type == "DO_DISPATCHED",
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
        entity_type="dispatch_order",
        entity_id=order.dispatch_id,
        new_values={"status": "Rejected", "reason": reject_data.reason}
    )
    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Dispatch order rejected",
    }

@router.patch("/{dispatch_id}/status", response_model=dict)
def update_dispatch_status(
    dispatch_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(DispatchOrders).filter(DispatchOrders.dispatch_id == dispatch_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Dispatch order not found")
        
    status = status_data.get("status")
    if status == "Cancelled" and order.status == "Scheduled":
        order.status = "Cancelled"
        log_audit(
            db=db,
            user_id=current_user.user_id,
            action="cancel",
            entity_type="dispatch_order",
            entity_id=order.dispatch_id,
            new_values={"status": "Cancelled"}
        )
        db.commit()
        return {"success": True, "message": "Order cancelled successfully"}
    
    raise HTTPException(status_code=400, detail="Invalid status update")

class DispatchItemsUpdate(BaseModel):
    items: List[DispatchItemUpdate]

@router.patch("/{dispatch_id}/items", response_model=dict)
def update_order_items(
    dispatch_id: int,
    update_data: DispatchItemsUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    order = db.query(DispatchOrders).filter(DispatchOrders.dispatch_id == dispatch_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Dispatch order not found")

    if order.status not in ["Scheduled", "Pending Approval"]:
        raise HTTPException(status_code=400, detail=f"Cannot edit items for order with status '{order.status}'")

    if not update_data.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    for item in update_data.items:
        if item.order_quantity <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be > 0 for all items")
        product = db.query(Products).filter(Products.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

    # Delete old items
    db.query(DispatchOrderItems).filter(DispatchOrderItems.dispatch_id == dispatch_id).delete()

    # Insert new items
    for item in update_data.items:
        do_item = DispatchOrderItems(
            dispatch_id=order.dispatch_id,
            product_id=item.product_id,
            order_quantity=item.order_quantity
        )
        db.add(do_item)

    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="update_items",
        entity_type="dispatch_order",
        entity_id=order.dispatch_id,
        new_values={"item_count": len(update_data.items)}
    )
    db.commit()

    return {
        "success": True,
        "message": "Dispatch order items updated successfully"
    }
