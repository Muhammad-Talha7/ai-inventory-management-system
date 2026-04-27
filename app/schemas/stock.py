from pydantic import BaseModel
from typing import Optional
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

    class Config:
        from_attributes = True
