from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models import Alerts, Users, Products, Inventory
from app.schemas.alert import AlertResponse
from app.core.dependencies import get_db, require_role

router = APIRouter()

from datetime import datetime, timedelta

@router.get("/", response_model=dict)
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status", description="active or resolved"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin"))
):
    query = db.query(Alerts, Products, Inventory).outerjoin(
        Products, Alerts.product_id == Products.product_id
    ).outerjoin(
        Inventory, Alerts.product_id == Inventory.product_id
    )
    
    # Filter by user role if not admin
    if current_user.role != "admin":
        query = query.filter(Alerts.target_role == current_user.role)
    
    if status_filter == "active":
        query = query.filter(Alerts.is_resolved == 0)
    elif status_filter == "resolved":
        # Only show resolved alerts from the last 24 hours
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        query = query.filter(Alerts.is_resolved == 1, Alerts.resolved_at >= one_day_ago)
    else:
        # Hide old resolved alerts by default
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        from sqlalchemy import or_
        query = query.filter(or_(Alerts.is_resolved == 0, Alerts.resolved_at >= one_day_ago))
        
    results = query.order_by(Alerts.created_at.desc()).all()
    
    data = []
    for alert, prod, inv in results:
        alert_dict = AlertResponse.model_validate(alert).model_dump()
        alert_dict['product_name'] = prod.product_name if prod else None
        alert_dict['current_stock'] = inv.current_stock if inv else 0
        alert_dict['min_stock'] = inv.min_stock if inv else 0
        data.append(alert_dict)
    
    return {
        "success": True,
        "data": data,
        "message": "Alerts retrieved successfully"
    }

@router.get("/{alert_id}", response_model=dict)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin"))
):
    alert = db.query(Alerts).filter(Alerts.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    return {
        "success": True,
        "data": AlertResponse.model_validate(alert).model_dump(),
        "message": "Alert retrieved successfully"
    }

@router.put("/{alert_id}/resolve", response_model=dict)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin"))
):
    alert = db.query(Alerts).filter(Alerts.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if current_user.role != "admin" and alert.target_role != current_user.role:
        raise HTTPException(status_code=403, detail="Not authorized to resolve this alert")
        
    if alert.is_resolved == 1:
        return {
            "success": True,
            "data": AlertResponse.model_validate(alert).model_dump(),
            "message": "Alert was already resolved"
        }
        
    alert.is_resolved = 1
    alert.resolved_by = current_user.user_id
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    
    return {
        "success": True,
        "data": AlertResponse.model_validate(alert).model_dump(),
        "message": "Alert resolved successfully"
    }
