from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models import Suppliers, Users
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.core.dependencies import get_db, get_current_user, require_role

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    return db.query(Suppliers).all()

@router.post("/", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role(["manager"]))
):
    existing = db.query(Suppliers).filter(Suppliers.supplier_id == supplier.supplier_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplier ID already exists"
        )
    db_supplier = Suppliers(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    db_supplier = db.query(Suppliers).filter(Suppliers.supplier_id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return db_supplier

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role(["manager"]))
):
    db_supplier = db.query(Suppliers).filter(Suppliers.supplier_id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role(["manager"]))
):
    db_supplier = db.query(Suppliers).filter(Suppliers.supplier_id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # We should also check if any products are using this supplier to prevent orphans
    from app.models import Products
    has_products = db.query(Products).filter(Products.supplier_id == supplier_id).first()
    if has_products:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete supplier as it is linked to one or more products"
        )
    
    db.delete(db_supplier)
    db.commit()
    return {"success": True, "message": "Supplier deleted successfully"}
