from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin
from app.models import Users
from app.core.dependencies import get_db, get_current_user, require_admin
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter()

@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db), current_user: Users = Depends(require_admin)):
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
