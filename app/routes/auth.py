from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin, UserUpdate
from app.models import Users
from app.core.dependencies import get_db, get_current_user, require_role
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.audit import log_audit

router = APIRouter()

@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db), current_user: Users = Depends(require_role("admin"))):
    # Check if user exists
    user = db.query(Users).filter(Users.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_in.password)
    new_user = Users(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role.value
    )
    db.add(new_user)
    db.flush()
    
    log_audit(
        db=db,
        user_id=current_user.user_id if current_user else None,
        action="register_user",
        entity_type="user",
        entity_id=new_user.user_id,
        new_values={"email": user_in.email, "role": user_in.role.value}
    )
    db.commit()
    db.refresh(new_user)
    
    user_data = {
        "user_id": new_user.user_id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "created_at": new_user.created_at
    }
    
    return {
        "success": True,
        "data": user_data,
        "message": "User registered successfully"
    }

@router.post("/login")
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer"
        },
        "message": "Login successful"
    }

@router.get("/me")
def get_me(current_user: Users = Depends(get_current_user)):
    user_data = {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at
    }
    return {
        "success": True,
        "data": user_data,
        "message": "Current user retrieved successfully"
    }

@router.put("/me")
def update_me(user_in: UserUpdate, db: Session = Depends(get_db), current_user: Users = Depends(get_current_user)):
    if user_in.name:
        current_user.name = user_in.name
    if user_in.email:
        # Check if email is taken
        existing = db.query(Users).filter(Users.email == user_in.email, Users.user_id != current_user.user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_in.email
    if user_in.password:
        current_user.password_hash = get_password_hash(user_in.password)
        
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="update_profile",
        entity_type="user",
        entity_id=current_user.user_id,
        new_values=user_in.model_dump(exclude_unset=True, exclude={"password"})
    )    
    db.commit()
    db.refresh(current_user)
    
    user_data = {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at
    }
    return {
        "success": True,
        "data": user_data,
        "message": "Profile updated successfully"
    }

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_user: Users = Depends(require_role("admin"))):
    users = db.query(Users).all()
    data = []
    for u in users:
        data.append({
            "user_id": u.user_id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at
        })
    return {
        "success": True,
        "data": data,
        "message": "Users retrieved successfully"
    }

@router.put("/users/{user_id}")
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: Users = Depends(require_role("admin"))):
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_in.name:
        user.name = user_in.name
    if user_in.email:
        existing = db.query(Users).filter(Users.email == user_in.email, Users.user_id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = user_in.email
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)
    if user_in.role:
        user.role = user_in.role.value
        
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="update_user",
        entity_type="user",
        entity_id=user.user_id,
        new_values=user_in.model_dump(exclude_unset=True, exclude={"password"})
    )    
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "data": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        },
        "message": "User updated successfully"
    }

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: Users = Depends(require_role("admin"))):
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    db.delete(user)
    
    log_audit(
        db=db,
        user_id=current_user.user_id,
        action="delete_user",
        entity_type="user",
        entity_id=user.user_id
    )
    db.commit()
    
    return {
        "success": True,
        "data": None,
        "message": "User deleted successfully"
    }
