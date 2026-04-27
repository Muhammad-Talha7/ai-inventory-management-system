from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.models import Products, Inventory, Users
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.core.dependencies import get_db, get_current_user, require_manager_or_above

router = APIRouter()

@router.post("/", response_model=dict)
def create_product(
    product_in: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: Users = Depends(require_manager_or_above)
):
    existing_id = db.query(Products).filter(Products.product_id == product_in.product_id).first()
    if existing_id:
        raise HTTPException(status_code=400, detail="Product with this ID already exists")
        
    existing_sku = db.query(Products).filter(Products.sku == product_in.sku).first()
    if existing_sku:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    
    new_prod = Products(
        product_id=product_in.product_id,
        product_name=product_in.product_name,
        sku=product_in.sku,
        category_id=product_in.category_id,
        supplier_id=product_in.supplier_id,
        unit_price=product_in.unit_price,
        cost_price=product_in.cost_price,
        lead_time_days=0
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    
    return {
        "success": True,
        "data": ProductResponse.model_validate(new_prod).model_dump(),
        "message": "Product created successfully"
    }

@router.get("/", response_model=dict)
def get_products(
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    query = db.query(Products)
    
    if category_id is not None:
        query = query.filter(Products.category_id == category_id)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Products.product_name.ilike(search_term),
            Products.sku.ilike(search_term)
        ))
        
    products = query.all()
    data = [ProductResponse.model_validate(p).model_dump() for p in products]
    
    return {
        "success": True,
        "data": data,
        "message": "Products retrieved successfully"
    }

@router.get("/{product_id}", response_model=dict)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    prod = db.query(Products).filter(Products.product_id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
        
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    
    prod_data = ProductResponse.model_validate(prod).model_dump()
    prod_data['inventory_quantity'] = inv.current_stock if inv else 0
    
    return {
        "success": True,
        "data": prod_data,
        "message": "Product retrieved successfully"
    }

@router.put("/{product_id}", response_model=dict)
def update_product(
    product_id: str,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_manager_or_above)
):
    prod = db.query(Products).filter(Products.product_id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product_in.sku is not None:
        existing_sku = db.query(Products).filter(Products.sku == product_in.sku, Products.product_id != product_id).first()
        if existing_sku:
            raise HTTPException(status_code=400, detail="Product with this SKU already exists")
            
    update_data = product_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prod, key, value)
        
    db.commit()
    db.refresh(prod)
    
    return {
        "success": True,
        "data": ProductResponse.model_validate(prod).model_dump(),
        "message": "Product updated successfully"
    }

@router.delete("/{product_id}", response_model=dict)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_manager_or_above)
):
    prod = db.query(Products).filter(Products.product_id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Optional: Check if product has inventory or stock transactions before deleting
    
    db.delete(prod)
    db.commit()
    
    return {
        "success": True,
        "data": None,
        "message": "Product deleted successfully"
    }
