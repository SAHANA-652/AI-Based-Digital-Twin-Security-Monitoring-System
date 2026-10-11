from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.connection import get_db_dependency
from services.auth_service import auth_service, get_current_user
from database.models import User
from pydantic import BaseModel
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None


class UserCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str


class UserResponse(BaseModel):
    name: str
    email: str
    phone: str
    full_name: str
    role: str


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db_dependency)):
    identifier = (login_data.username or login_data.email or "").strip()
    password = login_data.password or ""

    # Authenticate via auth_service by username or email (case-insensitive & trimmed)
    user = auth_service.authenticate(db, identifier, password)

    # Fallback profile match if full_name, email, and phone were provided and initial identifier lookup didn't match
    if not user and login_data.full_name and login_data.email and login_data.phone:
        candidate = db.query(User).filter(
            func.lower(User.full_name) == login_data.full_name.strip().lower(),
            func.lower(User.email) == login_data.email.strip().lower(),
            User.phone == login_data.phone.strip(),
        ).first()
        if candidate and auth_service.verify_password(password, candidate.password_hash):
            user = candidate
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if user.first_login is None:
                user.first_login = now
            user.last_login = now
            db.commit()

    if not user:
        # Fallback check for default admin
        if identifier.lower() == "admin" and password == "admin123":
            access_token = auth_service.create_access_token(data={"sub": "admin", "role": "admin"})
            return {"access_token": access_token, "token_type": "bearer"}
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = auth_service.create_access_token(data={"sub": user.username, "role": user.role or "analyst"})
    if user.role != "admin":
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if user.first_login is None:
            user.first_login = now
        user.last_login = now
        db.commit()
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/token", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_dependency)):
    user = auth_service.authenticate(db, form_data.username, form_data.password)
    if not user:
        if form_data.username == "admin" and form_data.password == "admin123":
            access_token = auth_service.create_access_token(data={"sub": "admin", "role": "admin"})
            return {"access_token": access_token, "token_type": "bearer"}
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = auth_service.create_access_token(data={"sub": user.username, "role": user.role or "analyst"})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db_dependency)):
    if len(user_in.password) <= 5 or not any(not char.isalnum() for char in user_in.password):
        raise HTTPException(status_code=400, detail="Password must be longer than 5 characters and include a special character")
    clean_email = user_in.email.strip().lower()
    clean_phone = user_in.phone.strip()
    clean_name = user_in.full_name.strip()
    existing = db.query(User).filter(
        (func.lower(User.email) == clean_email) |
        (func.lower(User.username) == clean_email) |
        (User.phone == clean_phone)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email or phone number already registered")
    user = auth_service.create_user(
        db, clean_email, user_in.password, clean_name,
        "analyst", clean_email, clean_phone
    )
    return UserResponse(name=user.full_name or "", email=user.email, phone=user.phone, full_name=user.full_name or "", role=user.role or "analyst")


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db_dependency)):
    username = current_user.get("sub")
    if username and username != "admin":
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.last_login = None
            db.commit()
    return {"status": "success", "message": "Session terminated"}


@router.get("/admin/users")
def list_users(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db_dependency)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    users = db.query(User).filter(User.role != "admin").order_by(User.created_at.desc()).all()
    user_list = []
    for user in users:
        if not user.is_active:
            status = "Disabled"
        elif not user.last_login:
            status = "Inactive"
        else:
            delta_seconds = (now - user.last_login).total_seconds()
            status = "Active" if delta_seconds <= 1800 else "Inactive"

        user_list.append({
            "username": user.username,
            "name": user.full_name or user.username,
            "email": user.email or "",
            "phone": user.phone or "",
            "activity_status": status,
            "first_login": user.first_login,
            "last_login": user.last_login,
        })
    return user_list


@router.delete("/admin/users/{username}")
def delete_user(username: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db_dependency)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(User).filter(User.username == username, User.role != "admin").first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}
