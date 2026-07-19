from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PurchaseOrderItemBase(BaseModel):
    product_id: str
    order_quantity: int
    received_quantity: Optional[int] = None

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    order_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    status: str
    supplier_id: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    pass

class PurchaseOrderResponse(PurchaseOrderBase):
    order_id: int
    created_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejected_by: Optional[int] = None
    received_by: Optional[int] = None
    received_at: Optional[datetime] = None
    receiving_notes: Optional[str] = None
    items: List[PurchaseOrderItemResponse] = []

    class Config:
        orm_mode = True
        from_attributes = True

class ManualOrderItemCreate(BaseModel):
    product_id: str
    order_quantity: int

class ManualOrderCreate(BaseModel):
    supplier_id: str
    items: List[ManualOrderItemCreate]

class OrderItemsUpdate(BaseModel):
    items: List[ManualOrderItemCreate]
