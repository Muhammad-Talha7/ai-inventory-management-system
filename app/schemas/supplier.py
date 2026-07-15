from pydantic import BaseModel
from typing import Optional

class SupplierBase(BaseModel):
    name: str
    contact_info: Optional[str] = None

class SupplierCreate(SupplierBase):
    supplier_id: str

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_info: Optional[str] = None

class SupplierResponse(SupplierBase):
    supplier_id: str

    class Config:
        from_attributes = True
