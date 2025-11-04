from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime


class WebsiteBase(BaseModel):
    url: str
    name: Optional[str] = None
    valid_word: str
    timeout: int = Field(default=30, ge=1, le=300)


class WebsiteCreate(WebsiteBase):
    pass


class WebsiteUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    valid_word: Optional[str] = None
    timeout: Optional[int] = Field(default=None, ge=1, le=300)
    is_active: Optional[bool] = None


class WebsiteResponse(BaseModel):
    id: int
    url: str
    name: Optional[str]
    valid_word: str
    timeout: int
    is_active: bool
    status: str
    response_time: Optional[float]
    error_message: Optional[str]
    last_check: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
