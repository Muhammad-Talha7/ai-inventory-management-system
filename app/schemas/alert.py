from pydantic import BaseModel
from datetime import datetime

class AlertResponse(BaseModel):
    id: int
    product_id: str
    alert_type: str
    message: str
    is_resolved: int
    created_at: datetime

    class Config:
        from_attributes = True
