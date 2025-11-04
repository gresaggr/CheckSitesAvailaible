from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status, Depends
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.db.session import get_async_session
from app.models.user import User

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__ident="2b"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # Для отладки
    print(f"Created token for user_id: {data.get('sub')}")
    print(f"Token expires at: {expire}")

    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    try:
        # Обрезаем пароль до 72 байт если нужно (ограничение bcrypt)
        if len(plain_password.encode('utf-8')) > 72:
            plain_password = plain_password[:72]
        result = pwd_context.verify(plain_password, hashed_password)
        print(f"Password verification result: {result}")  # Для отладки
        return result
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Хеширование пароля"""
    try:
        # Обрезаем пароль до 72 байт (ограничение bcrypt)
        if len(password.encode('utf-8')) > 72:
            password = password[:72]
        hashed = pwd_context.hash(password)
        print(f"Password hashed successfully")  # Для отладки
        return hashed
    except Exception as e:
        print(f"Password hashing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error hashing password"
        )
