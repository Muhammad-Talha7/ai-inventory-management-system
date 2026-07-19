from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.models import Alerts, Users, Products, Inventory
from app.schemas.alert import AlertResponse
from app.core.dependencies import get_db, require_role
from app.core.audit import log_audit

router = APIRouter()

from datetime import datetime, timedelta

class FlagIssueRequest(BaseModel):
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None

@router.get("/", response_model=dict)
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status", description="active or resolved"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor"))
):
    import re
    from sqlalchemy.orm import aliased
    Resolver = aliased(Users)

    query = (
        db.query(Alerts, Products, Inventory, Resolver)
        .outerjoin(Products, Alerts.product_id == Products.product_id)
        .outerjoin(Inventory, Alerts.product_id == Inventory.product_id)
        .outerjoin(Resolver, Alerts.resolved_by == Resolver.user_id)
    )

    if current_user.role == "admin":
        query = query.filter(Alerts.alert_type == "USER_ALERT")
    elif current_user.role == "auditor":
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Alerts.alert_type == "AUDIT_ISSUE",
                Alerts.target_user_id == current_user.user_id
            )
        )
    else:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Alerts.target_role == current_user.role,
                Alerts.target_user_id == current_user.user_id
            )
        )

    if status_filter == "active":
        query = query.filter(Alerts.is_resolved == 0)
    elif status_filter == "resolved":
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        query = query.filter(Alerts.is_resolved == 1, Alerts.resolved_at >= one_day_ago)
    else:
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        from sqlalchemy import or_
        query = query.filter(or_(Alerts.is_resolved == 0, Alerts.resolved_at >= one_day_ago))

    results = query.order_by(Alerts.created_at.desc()).all()

    def resolve_message(message: str) -> str:
        pattern = r'\[Entity:\s*user,\s*ID:\s*(\d+)\]'
        for match in re.finditer(pattern, message):
            uid = int(match.group(1))
            u = db.query(Users).filter(Users.user_id == uid).first()
            if u:
                replacement = f'[User: {u.email} ({u.name})]'
            else:
                replacement = f'[User ID: {uid}]'
            message = message.replace(match.group(0), replacement)
        return message

    data = []
    for alert, prod, inv, resolver in results:
        alert_dict = AlertResponse.model_validate(alert).model_dump()
        alert_dict['message'] = resolve_message(alert_dict['message'])
        alert_dict['product_name'] = prod.product_name if prod else None
        alert_dict['current_stock'] = inv.current_stock if inv else 0
        alert_dict['min_stock'] = inv.min_stock if inv else 0
        alert_dict['resolved_by_name'] = resolver.name if resolver else None
        alert_dict.pop('resolved_by', None)
        data.append(alert_dict)

    return {
        "success": True,
        "data": data,
        "message": "Alerts retrieved successfully"
    }


@router.get("/managers", response_model=dict)
def get_managers(
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("admin", "auditor"))
):
    managers = db.query(Users).filter(Users.role == "manager").all()
    return {
        "success": True,
        "data": [{"user_id": m.user_id, "name": m.name, "email": m.email} for m in managers]
    }

@router.get("/{alert_id}", response_model=dict)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor"))
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
        
    if current_user.role != "admin":
        if alert.target_role != current_user.role and alert.target_user_id != current_user.user_id:
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

@router.post("/flag", response_model=dict)
def flag_issue(
    flag_in: FlagIssueRequest,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("auditor"))
):
    if not flag_in.message or not flag_in.message.strip():
        raise HTTPException(status_code=400, detail="Message is required to flag an issue")

    context_parts = []
    if flag_in.entity_type and flag_in.entity_id:
        if flag_in.entity_type == "user":
            try:
                affected_user = db.query(Users).filter(Users.user_id == int(flag_in.entity_id)).first()
                label = affected_user.email if affected_user else flag_in.entity_id
                context_parts.append(f"User: {label}")
            except (ValueError, TypeError):
                context_parts.append(f"User ID: {flag_in.entity_id}")
        else:
            context_parts.append(f"{flag_in.entity_type.replace('_', ' ').title()} #{flag_in.entity_id}")
    elif flag_in.entity_type:
        context_parts.append(f"Entity: {flag_in.entity_type}")
    context_str = f" [{', '.join(context_parts)}]" if context_parts else ""

    new_alert = Alerts(
        product_id=None,
        alert_type="AUDIT_ISSUE",
        target_role="admin",
        message=f"[Flagged by Auditor {current_user.name}]{context_str}: {flag_in.message.strip()}",
        is_resolved=0,
    )
    db.add(new_alert)
    db.flush()

    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="flag_issue",
        entity_type=flag_in.entity_type or "audit_log",
        entity_id=flag_in.entity_id or "N/A",
        new_values={"message": flag_in.message}
    )
    db.commit()
    db.refresh(new_alert)

    return {
        "success": True,
        "data": AlertResponse.model_validate(new_alert).model_dump(),
        "message": "Issue flagged successfully — Admin has been notified"
    }

@router.post("/{alert_id}/assign", response_model=dict)
def assign_investigation(
    alert_id: int,
    manager_id: int = Body(..., embed=True),
    notes: str = Body("", embed=True),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("admin", "auditor"))
):
    alert = db.query(Alerts).filter(Alerts.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.alert_type != "AUDIT_ISSUE":
        raise HTTPException(status_code=400, detail="Only AUDIT_ISSUE alerts can be assigned for investigation")

    manager = db.query(Users).filter(Users.user_id == manager_id, Users.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    role_label = "Auditor" if current_user.role == "auditor" else "Admin"
    note_suffix = f" Notes from {role_label}: {notes.strip()}" if notes and notes.strip() else ""
    investigation_alert = Alerts(
        product_id=None,
        alert_type="INVESTIGATION_ASSIGNED",
        target_role=None,
        target_user_id=manager_id,
        message=f"[{role_label} Investigation Assignment] You have been assigned to investigate a flagged issue. Original report: {alert.message}{note_suffix}",
        is_resolved=0,
    )
    db.add(investigation_alert)

    alert.is_resolved = 1
    alert.resolved_by = current_user.user_id
    alert.resolved_at = datetime.utcnow()

    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="assign_investigation",
        entity_type="alert",
        entity_id=str(alert_id),
        new_values={"assigned_to_manager_id": manager_id, "manager_name": manager.name, "notes": notes}
    )
    db.commit()

    return {
        "success": True,
        "data": {"assigned_to": manager.name},
        "message": f"Investigation assigned to {manager.name}"
    }
