from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PurchaseOrderBase(BaseModel):
    product_id: str
    order_quantity: int
    status: str

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderResponse(PurchaseOrderBase):
    order_id: int
    created_at: Optional[datetime] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True
