from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    default_telegram_chat_id: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    balance: float
    is_active: bool
    email: EmailStr
    username: str
    default_telegram_chat_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
