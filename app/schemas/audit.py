from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True
