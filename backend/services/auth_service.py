import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from database.models import User
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")


class AuthService:
    def __init__(self):
        self.secret_key = getattr(settings, "SECRET_KEY", "digital-twin-secret-key-change-in-production")
        self.algorithm = getattr(settings, "ALGORITHM", "HS256")
        self.access_token_expire_minutes = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        if not plain_password or not hashed_password:
            return False
        try:
            pwd_bytes = plain_password.encode('utf-8')[:72]
            hash_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False

    def get_password_hash(self, password: str) -> str:
        pwd_bytes = password.encode('utf-8')[:72]
        salt = bcrypt.gensalt(rounds=10)
        return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

    def create_user(
        self,
        db: Session,
        username: str,
        password: str,
        full_name: str = "",
        role: str = "analyst",
        email: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> User:
        hashed_pwd = self.get_password_hash(password)
        db_user = User(
            username=username,
            email=email,
            phone=phone,
            password_hash=hashed_pwd,
            full_name=full_name,
            role=role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def authenticate(self, db: Session, username: str, password: str) -> Optional[User]:
        if not username or not password:
            return None
        clean_identifier = username.strip().lower()
        user = db.query(User).filter(
            (func.lower(User.username) == clean_identifier) |
            (func.lower(User.email) == clean_identifier)
        ).first()
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if user.first_login is None:
            user.first_login = now
        user.last_login = now
        db.commit()
        return user

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None

    def ensure_default_admin(self, db: Session) -> None:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            self.create_user(db, "admin", "admin123", "System Administrator", "admin")


auth_service = AuthService()


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = auth_service.verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    username: str = payload.get("sub", "")
    return {"username": username, "role": payload.get("role", "analyst")}
