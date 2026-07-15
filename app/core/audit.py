import json
from sqlalchemy.orm import Session
from typing import Optional, Any
from app.models import AuditLogs

def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: str,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """
    Helper function to record an audit log entry.
    Call this right before db.commit() to ensure it shares the transaction.
    """
    old_val_str = json.dumps(old_values) if old_values is not None else None
    new_val_str = json.dumps(new_values) if new_values is not None else None

    audit_entry = AuditLogs(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_values=old_val_str,
        new_values=new_val_str,
        ip_address=ip_address
    )
    db.add(audit_entry)
