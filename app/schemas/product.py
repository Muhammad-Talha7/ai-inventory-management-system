from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    product_name: str
    sku: str
    category_id: Optional[int] = None
    supplier_id: Optional[str] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None

class ProductCreate(ProductBase):
    product_id: str

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[str] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None

class ProductResponse(ProductBase):
    product_id: str
    inventory_quantity: Optional[int] = None

    class Config:
        from_attributes = True
