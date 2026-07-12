from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models import Products, Inventory, StockTransactions, Alerts, Users
from app.schemas.stock import (
    TransactionCreate, InventoryResponse, TransactionResponse,
    StockRequestCreate, StockRequestResponse,
)
from app.core.dependencies import get_db, get_current_user, require_role

router = APIRouter()

# ---------- Constants ----------
CV_SYSTEM_EMAIL = "cv_system@warehouse.internal"


class ScanCreate(BaseModel):
    sku: str
    quantity: int = 1
    type: str  # "IN" or "OUT"
    source: Optional[str] = "Auto via CV"

class BulkScanCreate(BaseModel):
    scans: List[ScanCreate]

# ---------- Helpers ----------

def _apply_inventory_change(db: Session, product_id: str, quantity: int,
                            transaction_type: str):
    """Apply stock change to Inventory and trigger low-stock alert if needed."""
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if not inv:
        inv = Inventory(
            product_id=product_id,
            current_stock=0,
            min_stock=10,
            max_stock=500,
        )
        db.add(inv)
        db.flush()

    if transaction_type == "OUT" and inv.current_stock - quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for OUT transaction")

    if transaction_type == "IN":
        inv.current_stock += quantity
    else:
        inv.current_stock -= quantity
    inv.last_updated = func.now()

    # Low-stock alert
    if inv.current_stock < inv.min_stock:
        existing_alert = db.query(Alerts).filter(
            Alerts.product_id == product_id,
            Alerts.is_resolved == 0,
            Alerts.alert_type == "LOW",
        ).first()
        if not existing_alert:
            db.add(Alerts(
                product_id=product_id,
                alert_type="LOW_STOCK",
                target_role="manager",
                message=f"Low stock alert: {inv.current_stock} remaining (Min: {inv.min_stock})",
                is_resolved=0,
            ))

    return inv


# ==========================================================================
# STOCK REQUESTS — Approval Workflow
# ==========================================================================

@router.post("/requests", response_model=dict)
def create_stock_request(
    request_in: StockRequestCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager")),
):
    """Staff or manager submits a stock IN/OUT request (status=pending).
    Inventory is NOT touched until a manager approves."""
    if request_in.transaction_type not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="transaction_type must be IN or OUT")
    if request_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    # Verify product exists
    product = db.query(Products).filter(
        Products.product_id == request_in.product_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_tx = StockTransactions(
        product_id=request_in.product_id,
        user_id=current_user.user_id,
        quantity=request_in.quantity,
        type=request_in.transaction_type,
        source="Stock Request",
        status="pending",
        requested_by=current_user.user_id,
        reason=request_in.reason,
    )
    new_alert = Alerts(
        product_id=request_in.product_id,
        alert_type="STOCK_REQ_SUBMITTED",
        target_role="manager",
        message=f"{current_user.name} requested {request_in.transaction_type} for {request_in.quantity} units. Reason: {request_in.reason or 'None'}",
        is_resolved=0,
    )
    db.add(new_tx)
    db.add(new_alert)
    db.commit()
    db.refresh(new_tx)

    return {
        "success": True,
        "data": StockRequestResponse(
            transaction_id=new_tx.transaction_id,
            product_id=new_tx.product_id,
            product_name=product.product_name,
            quantity=new_tx.quantity,
            type=new_tx.type,
            status=new_tx.status,
            reason=new_tx.reason,
            requested_by=new_tx.requested_by,
            requester_name=current_user.name,
            timestamp=new_tx.timestamp,
            source=new_tx.source,
        ).model_dump(),
        "message": "Stock request submitted (pending approval)",
    }


@router.get("/requests", response_model=dict)
def list_stock_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    """List stock requests with optional status filter.
    Staff sees only their own; manager/admin sees all."""
    query = (
        db.query(StockTransactions, Products, Users)
        .join(Products, StockTransactions.product_id == Products.product_id)
        .outerjoin(Users, StockTransactions.requested_by == Users.user_id)
    )

    # Staff can only see their own requests
    if current_user.role == "staff":
        query = query.filter(StockTransactions.requested_by == current_user.user_id)

    if status_filter and status_filter != 'all':
        query = query.filter(StockTransactions.status == status_filter)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Products.product_name.ilike(search_term),
                Users.name.ilike(search_term)
            )
        )

    total_count = query.count()
    results = query.order_by(StockTransactions.timestamp.desc()).offset(offset).limit(limit).all()

    data = []
    for tx, prod, requester in results:
        data.append(StockRequestResponse(
            transaction_id=tx.transaction_id,
            product_id=tx.product_id,
            product_name=prod.product_name if prod else None,
            quantity=tx.quantity,
            type=tx.type,
            status=tx.status or "pending",
            reason=tx.reason,
            requested_by=tx.requested_by,
            requester_name=requester.name if requester else None,
            approved_by=tx.approved_by,
            approved_at=tx.approved_at,
            timestamp=tx.timestamp,
            source=tx.source,
        ).model_dump())

    return {
        "success": True,
        "data": data,
        "has_more": offset + limit < total_count,
        "total": total_count,
        "message": "Stock requests retrieved successfully",
    }


@router.post("/requests/{transaction_id}/approve", response_model=dict)
def approve_stock_request(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    """Manager approves a pending stock request — applies inventory change."""
    tx = db.query(StockTransactions).filter(
        StockTransactions.transaction_id == transaction_id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Stock request not found")
    if tx.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {tx.status}")

    # Self-approval block
    if tx.requested_by == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "message": "Cannot approve your own stock request",
            },
        )

    # Apply inventory change
    inv = _apply_inventory_change(db, tx.product_id, tx.quantity, tx.type)

    tx.status = "approved"
    tx.approved_by = current_user.user_id
    tx.approved_at = datetime.utcnow()

    # Resolve associated alert
    alert = db.query(Alerts).filter(
        Alerts.product_id == tx.product_id,
        Alerts.alert_type == "STOCK_REQ_SUBMITTED",
        Alerts.is_resolved == 0
    ).first()
    if alert:
        alert.is_resolved = 1
        alert.resolved_by = current_user.user_id
        alert.resolved_at = datetime.utcnow()

    # Create alert for the staff member
    staff_alert = Alerts(
        product_id=tx.product_id,
        alert_type="STOCK_REQ_APPROVED",
        target_role="staff",
        message=f"Your stock {tx.type} request for {tx.quantity} units was approved.",
        is_resolved=0,
    )
    db.add(staff_alert)

    db.commit()
    db.refresh(tx)

    product = db.query(Products).filter(Products.product_id == tx.product_id).first()

    return {
        "success": True,
        "data": {
            "transaction_id": tx.transaction_id,
            "product_id": tx.product_id,
            "product_name": product.product_name if product else None,
            "quantity": tx.quantity,
            "type": tx.type,
            "status": tx.status,
            "approved_by": tx.approved_by,
            "approved_at": tx.approved_at,
            "new_stock_level": inv.current_stock,
        },
        "message": "Stock request approved — inventory updated",
    }


@router.post("/requests/{transaction_id}/reject", response_model=dict)
def reject_stock_request(
    transaction_id: int,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager")),
):
    """Manager rejects a pending stock request — no inventory change."""
    tx = db.query(StockTransactions).filter(
        StockTransactions.transaction_id == transaction_id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Stock request not found")
    if tx.status != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {tx.status}")

    # Self-rejection block
    if tx.requested_by == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "message": "Cannot reject your own stock request",
            },
        )

    tx.status = "rejected"
    tx.approved_by = current_user.user_id  # "approved_by" doubles as "acted_by"
    tx.approved_at = datetime.utcnow()

    # Resolve associated alert
    alert = db.query(Alerts).filter(
        Alerts.product_id == tx.product_id,
        Alerts.alert_type == "STOCK_REQ_SUBMITTED",
        Alerts.is_resolved == 0
    ).first()
    if alert:
        alert.is_resolved = 1
        alert.resolved_by = current_user.user_id
        alert.resolved_at = datetime.utcnow()

    # Create alert for the staff member
    staff_alert = Alerts(
        product_id=tx.product_id,
        alert_type="STOCK_REQ_REJECTED",
        target_role="staff",
        message=f"Your stock request for {tx.product_id} was rejected. Reason: {reason}",
        is_resolved=0,
    )
    db.add(staff_alert)

    db.commit()
    db.refresh(tx)

    return {
        "success": True,
        "data": {
            "transaction_id": tx.transaction_id,
            "status": tx.status,
            "rejected_by": tx.approved_by,
        },
        "message": "Stock request rejected",
    }


# ==========================================================================
# CV SCANNER — Instant Apply (bypasses approval)
# ==========================================================================

@router.post("/scan", response_model=dict)
def scan_transaction(
    scan_in: ScanCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff")),
):
    """Accept a SKU-based transaction from the CV scanner or manual scan.
    
    If the caller is the reserved cv_system actor, the transaction is applied
    instantly (status=approved). Otherwise it creates a pending request.
    """
    if scan_in.type not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="Transaction type must be IN or OUT")
    if scan_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    product = db.query(Products).filter(Products.sku == scan_in.sku).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"No product found with SKU: {scan_in.sku}")

    is_cv_system = current_user.email == CV_SYSTEM_EMAIL

    if is_cv_system:
        # CV scanner: creates pending request requiring manager approval
        new_tx = StockTransactions(
            product_id=product.product_id,
            user_id=current_user.user_id,
            quantity=scan_in.quantity,
            type=scan_in.type,
            source=scan_in.source or "Auto via CV",
            status="pending",
            requested_by=current_user.user_id,
        )
        new_alert = Alerts(
            product_id=product.product_id,
            alert_type="STOCK_REQ_SUBMITTED",
            target_role="manager",
            message=f"CV System requested {scan_in.type} for {scan_in.quantity} units. Source: {scan_in.source or 'Auto via CV'}",
            is_resolved=0,
        )
        db.add(new_tx)
        db.add(new_alert)
        db.commit()
        db.refresh(new_tx)

        return {
            "success": True,
            "data": {
                "transaction_id": new_tx.transaction_id,
                "product_id": product.product_id,
                "product_name": product.product_name,
                "sku": scan_in.sku,
                "quantity": new_tx.quantity,
                "type": new_tx.type,
                "status": "pending",
            },
            "message": f"CV scan submitted for verification: {scan_in.type} x{scan_in.quantity} for {product.product_name}",
        }
    else:
        # Regular user scan: create pending request
        new_tx = StockTransactions(
            product_id=product.product_id,
            user_id=current_user.user_id,
            quantity=scan_in.quantity,
            type=scan_in.type,
            source=scan_in.source or "Manual Scan",
            status="pending",
            requested_by=current_user.user_id,
        )
        new_alert = Alerts(
            product_id=product.product_id,
            alert_type="STOCK_REQ_SUBMITTED",
            target_role="manager",
            message=f"{current_user.name} scanned {scan_in.type} for {scan_in.quantity} units. Source: {scan_in.source or 'CV Scanner'}",
            is_resolved=0,
        )
        db.add(new_tx)
        db.add(new_alert)
        db.commit()
        db.refresh(new_tx)

        return {
            "success": True,
            "data": {
                "transaction_id": new_tx.transaction_id,
                "product_id": product.product_id,
                "product_name": product.product_name,
                "sku": scan_in.sku,
                "quantity": new_tx.quantity,
                "type": new_tx.type,
                "status": "pending",
            },
        }


@router.post("/scan/bulk", response_model=dict)
def bulk_scan_transactions(
    bulk_in: BulkScanCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff")),
):
    """Accept a batch of SKU-based transactions from the CV scanner."""
    transactions = []
    
    for scan_in in bulk_in.scans:
        if scan_in.type not in ("IN", "OUT"):
            continue
        if scan_in.quantity <= 0:
            continue

        product = db.query(Products).filter(Products.sku == scan_in.sku).first()
        if not product:
            continue
            
        new_tx = StockTransactions(
            product_id=product.product_id,
            user_id=current_user.user_id,
            quantity=scan_in.quantity,
            type=scan_in.type,
            source=scan_in.source or "CV Scanner Bulk",
            status="pending",
            requested_by=current_user.user_id,
        )
        new_alert = Alerts(
            product_id=product.product_id,
            alert_type="STOCK_REQ_SUBMITTED",
            target_role="manager",
            message=f"{current_user.name} scanned {scan_in.type} for {scan_in.quantity} units. Source: {scan_in.source or 'CV Scanner Bulk'}",
            is_resolved=0,
        )
        db.add(new_tx)
        db.add(new_alert)
        transactions.append(new_tx)
        
    db.commit()
    
    return {
        "success": True,
        "data": {"processed_count": len(transactions)},
        "message": f"Successfully submitted {len(transactions)} pending stock requests.",
    }

# ==========================================================================
# LEGACY TRANSACTION ENDPOINT — Now creates pending request
# ==========================================================================

@router.post("/transaction", response_model=dict)
def create_transaction(
    transaction_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager")),
):
    """Create a stock transaction (now creates a pending request)."""
    if transaction_in.type not in ("IN", "OUT"):
        raise HTTPException(status_code=400, detail="Transaction type must be IN or OUT")
    if transaction_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    product = db.query(Products).filter(
        Products.product_id == transaction_in.product_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_tx = StockTransactions(
        product_id=transaction_in.product_id,
        user_id=current_user.user_id,
        quantity=transaction_in.quantity,
        type=transaction_in.type,
        source=transaction_in.source,
        status="pending",
        requested_by=current_user.user_id,
    )
    new_alert = Alerts(
        product_id=transaction_in.product_id,
        alert_type="STOCK_REQ_SUBMITTED",
        target_role="manager",
        message=f"{current_user.name} requested {transaction_in.type} for {transaction_in.quantity} units. Source: {transaction_in.source or 'None'}",
        is_resolved=0,
    )
    db.add(new_tx)
    db.add(new_alert)
    db.commit()
    db.refresh(new_tx)

    return {
        "success": True,
        "data": TransactionResponse.model_validate(new_tx).model_dump(),
        "message": "Stock request submitted (pending approval)",
    }


# ==========================================================================
# INVENTORY VIEWS — Read-only
# ==========================================================================

@router.get("/", response_model=dict)
def get_inventory(
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    results = db.query(Products, Inventory).outerjoin(
        Inventory, Products.product_id == Inventory.product_id
    ).all()

    data = []
    for prod, inv in results:
        data.append({
            "product_id": prod.product_id,
            "product_name": prod.product_name,
            "sku": prod.sku,
            "current_stock": inv.current_stock if inv else 0,
            "min_stock": inv.min_stock if inv else 10,
            "max_stock": inv.max_stock if inv else 500,
            "last_updated": inv.last_updated if inv else None,
        })

    return {
        "success": True,
        "data": data,
        "message": "Inventory retrieved successfully",
    }


@router.get("/{product_id}", response_model=dict)
def get_product_inventory(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    result = db.query(Products, Inventory).outerjoin(
        Inventory, Products.product_id == Inventory.product_id
    ).filter(Products.product_id == product_id).first()

    if not result:
        raise HTTPException(status_code=404, detail="Product not found")

    prod, inv = result
    data = {
        "product_id": prod.product_id,
        "product_name": prod.product_name,
        "sku": prod.sku,
        "current_stock": inv.current_stock if inv else 0,
        "min_stock": inv.min_stock if inv else 10,
        "max_stock": inv.max_stock if inv else 500,
        "last_updated": inv.last_updated if inv else None,
    }

    return {
        "success": True,
        "data": data,
        "message": "Inventory details retrieved successfully",
    }


@router.get("/{product_id}/history", response_model=dict)
def get_stock_history(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin")),
):
    transactions = (
        db.query(StockTransactions)
        .filter(StockTransactions.product_id == product_id)
        .order_by(StockTransactions.timestamp.desc())
        .all()
    )
    data = [TransactionResponse.model_validate(tx).model_dump() for tx in transactions]

    return {
        "success": True,
        "data": data,
        "message": "Stock history retrieved successfully",
    }
