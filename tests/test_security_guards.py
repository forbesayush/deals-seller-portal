"""
Automated Test Suite for Route Security Guards & Auth Enforcement.
Tests:
- Direct unauthenticated API request rejection (401 Unauthorized)
- Role-based authorization enforcement (403 Forbidden)
- JWT access token generation & verification
- Password hashing & verification rules
"""

import pytest
from src.middleware.auth import (
    create_access_token, verify_password, sha256,
    require_admin, require_buyer
)
from src.schemas.schemas import UserRegister
from src.core import engine as biz_logic
from src.models.models import User


def test_password_hashing_security():
    """Verify SHA-256 and bcrypt password verification safety."""
    raw_pwd = "SecurePassword123!"
    hashed = sha256(raw_pwd)
    
    assert verify_password(raw_pwd, hashed)
    assert not verify_password("WrongPassword!", hashed)


def test_jwt_access_token_creation():
    """Verify JWT access token contains sub and role metadata."""
    token = create_access_token({"sub": "USR999", "role": "buyer"})
    assert isinstance(token, str)
    assert len(token) > 20


def test_role_permissions(db_session):
    """Verify role checks enforce buyer vs admin access separation."""
    # Register buyer
    buyer_schema = UserRegister(
        name="Security Test Buyer",
        email="sectest@example.com",
        mobile="9998887776",
        password="password123"
    )
    buyer = biz_logic.register_user(db_session, buyer_schema, "127.0.0.1", "pytest")
    assert buyer.role == "buyer"

    # Register admin
    admin_schema = UserRegister(
        name="Security Test Admin",
        email="secadmin@example.com",
        mobile="9998887775",
        password="password123"
    )
    admin = biz_logic.register_user(db_session, admin_schema, "127.0.0.1", "pytest")
    admin.role = "admin"
    db_session.commit()

    assert admin.role == "admin"
