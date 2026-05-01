from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models import Alerts, Users, Products, Inventory
from app.schemas.alert import AlertResponse
from app.core.dependencies import get_db, get_current_user

router = APIRouter()

@router.get("/", response_model=dict)
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status", description="active or resolved"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    query = db.query(Alerts, Products, Inventory).outerjoin(
        Products, Alerts.product_id == Products.product_id
    ).outerjoin(
        Inventory, Alerts.product_id == Inventory.product_id
    )
    
    if status_filter == "active":
        query = query.filter(Alerts.is_resolved == 0)
    elif status_filter == "resolved":
        query = query.filter(Alerts.is_resolved == 1)
        
    results = query.order_by(Alerts.created_at.desc()).all()
    
    data = []
    for alert, prod, inv in results:
        alert_dict = AlertResponse.model_validate(alert).model_dump()
        alert_dict['product_name'] = prod.product_name if prod else "Unknown Product"
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
    current_user: Users = Depends(get_current_user)
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
    current_user: Users = Depends(get_current_user)
):
    alert = db.query(Alerts).filter(Alerts.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if alert.is_resolved == 1:
        return {
            "success": True,
            "data": AlertResponse.model_validate(alert).model_dump(),
            "message": "Alert was already resolved"
        }
        
    alert.is_resolved = 1
    db.commit()
    db.refresh(alert)
    
    return {
        "success": True,
        "data": AlertResponse.model_validate(alert).model_dump(),
        "message": "Alert resolved successfully"
    }
