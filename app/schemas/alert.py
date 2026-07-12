from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertResponse(BaseModel):
    id: int
    product_id: Optional[str] = None
    alert_type: str
    target_role: str
    message: str
    is_resolved: int
    created_at: datetime
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
