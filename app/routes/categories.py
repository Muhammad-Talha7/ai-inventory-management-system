from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models import Categories, Products, Users
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.core.dependencies import get_db, require_role
from app.core.audit import log_audit

router = APIRouter()

@router.post("/", response_model=dict)
def create_category(
    category_in: CategoryCreate, 
    db: Session = Depends(get_db), 
    current_user: Users = Depends(require_role("manager"))
):
    existing = db.query(Categories).filter(Categories.name == category_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    new_cat = Categories(name=category_in.name)
    db.add(new_cat)
    db.flush()
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="create_category",
        entity_type="category",
        entity_id=new_cat.category_id,
        new_values={"name": category_in.name}
    )
    db.commit()
    db.refresh(new_cat)
    
    return {
        "success": True,
        "data": CategoryResponse.model_validate(new_cat).model_dump(),
        "message": "Category created successfully"
    }

@router.get("/", response_model=dict)
def get_categories(
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor"))
):
    cats = db.query(Categories).all()
    data = [CategoryResponse.model_validate(c).model_dump() for c in cats]
    return {
        "success": True,
        "data": data,
        "message": "Categories retrieved successfully"
    }

@router.get("/{category_id}", response_model=dict)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("staff", "manager", "admin", "auditor"))
):
    cat = db.query(Categories).filter(Categories.category_id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "success": True,
        "data": CategoryResponse.model_validate(cat).model_dump(),
        "message": "Category retrieved successfully"
    }

@router.put("/{category_id}", response_model=dict)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager"))
):
    cat = db.query(Categories).filter(Categories.category_id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    existing = db.query(Categories).filter(Categories.name == category_in.name, Categories.category_id != category_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
        
    cat.name = category_in.name
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="update_category",
        entity_type="category",
        entity_id=cat.category_id,
        new_values={"name": category_in.name}
    )
    db.commit()
    db.refresh(cat)
    
    return {
        "success": True,
        "data": CategoryResponse.model_validate(cat).model_dump(),
        "message": "Category updated successfully"
    }

@router.delete("/{category_id}", response_model=dict)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(require_role("manager"))
):
    cat = db.query(Categories).filter(Categories.category_id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    products = db.query(Products).filter(Products.category_id == category_id).first()
    if products:
        raise HTTPException(status_code=400, detail="Cannot delete category because it has associated products")
        
    db.delete(cat)
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="delete_category",
        entity_type="category",
        entity_id=cat.category_id
    )
    db.commit()
    
    return {
        "success": True,
        "data": None,
        "message": "Category deleted successfully"
    }
