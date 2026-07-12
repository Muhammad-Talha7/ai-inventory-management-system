from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TransactionCreate(BaseModel):
    product_id: str
    quantity: int
    type: str  # "IN" or "OUT"
    source: Optional[str] = "Manual Entry"

class InventoryResponse(BaseModel):
    product_id: str
    product_name: str
    sku: str
    current_stock: int
    min_stock: int
    max_stock: int
    last_updated: datetime

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    transaction_id: int
    product_id: str
    user_id: int
    quantity: int
    type: str
    source: Optional[str] = None
    timestamp: datetime
    status: Optional[str] = None
    requested_by: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    reason: Optional[str] = None

    class Config:
        from_attributes = True


# ---- Stock Request Schemas (approval workflow) ----

class StockRequestCreate(BaseModel):
    product_id: str
    transaction_type: str  # "IN" or "OUT"
    quantity: int
    reason: Optional[str] = None

class StockRequestResponse(BaseModel):
    transaction_id: int
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    type: str
    status: str
    reason: Optional[str] = None
    requested_by: Optional[int] = None
    requester_name: Optional[str] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    timestamp: Optional[datetime] = None
    source: Optional[str] = None

    class Config:
        from_attributes = True
