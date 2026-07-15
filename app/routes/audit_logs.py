from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import json

from app.models import AuditLogs, Users
from app.schemas.audit import AuditLogResponse
from app.core.dependencies import get_db, require_role

router = APIRouter()

@router.get("/", response_model=dict)
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("admin", "auditor"))
):
    query = db.query(AuditLogs, Users).outerjoin(Users, AuditLogs.user_id == Users.user_id)
    
    if action:
        query = query.filter(AuditLogs.action == action)
    if entity_type:
        query = query.filter(AuditLogs.entity_type == entity_type)
        
    total_count = query.count()
    results = query.order_by(AuditLogs.timestamp.desc()).offset(skip).limit(limit).all()
    
    data = []
    for log, user in results:
        # Parse JSON strings safely
        old_val = json.loads(log.old_values) if log.old_values else None
        new_val = json.loads(log.new_values) if log.new_values else None
        
        data.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.name if user else "System",
            "user_role": user.role if user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": old_val,
            "new_values": new_val,
            "timestamp": log.timestamp,
            "ip_address": log.ip_address
        })

    return {
        "success": True,
        "data": data,
        "total_count": total_count,
        "message": "Audit logs retrieved successfully"
    }
