import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session
from src.database.db import get_db
from src.models.models import User

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-deals-portal-key-for-auth-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

security = HTTPBearer(auto_error=False)

# ─────────────────────────────────────────────
#  PASSWORD SECURITY (Bcrypt & SHA-256 fallback)
# ─────────────────────────────────────────────
def sha256(text: str) -> str:
    """Old SHA-256 hex encoding used for seed data."""
    return hashlib.sha256(text.encode()).hexdigest()

def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for passwords."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password by checking bcrypt first, falling back to SHA-256 hex."""
    try:
        # Check if hash looks like a bcrypt hash (starts with $2b$ or $2a$)
        if hashed_password.startswith('$2b$') or hashed_password.startswith('$2a$'):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        else:
            # SHA-256 hex fallback
            return sha256(plain_password) == hashed_password
    except Exception:
        return False

# ─────────────────────────────────────────────
#  JWT TOKEN OPERATIONS
# ─────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# ─────────────────────────────────────────────
#  FASTAPI DEPENDENCIES FOR USER & ROLES
# ─────────────────────────────────────────────
def get_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    """Helper to extract JWT from Authorization header OR cookie."""
    # 1. Try Authorization header
    if credentials:
        return credentials.credentials
    # 2. Try cookie
    return request.cookies.get("token")

def get_current_user(request: Request, db: Session = Depends(get_db), token: Optional[str] = Depends(get_token_from_request)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact support."
        )
    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated."
        )
        
    return user

class RoleChecker:
    """Dependency checker for Role-Based Access Control."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        # super_admin has access to everything
        if current_user.role == 'super_admin':
            return current_user
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted. Required roles: {self.allowed_roles}"
            )
        return current_user

# Convenience instances
require_admin = RoleChecker(["admin"])
require_staff = RoleChecker(["admin", "manager", "auditor"])
require_buyer = RoleChecker(["buyer"])
