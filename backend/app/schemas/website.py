from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class WebsiteBase(BaseModel):
    url: str
    name: Optional[str] = None
    valid_word: str
    timeout: int = Field(default=30, ge=1, le=300)
    telegram_chat_id: Optional[str] = None
    check_interval: int = Field(default=300, ge=60, le=3600)
    failure_threshold: int = Field(default=3, ge=1, le=10)


class WebsiteCreate(WebsiteBase):
    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v.strip()

    @field_validator('valid_word')
    @classmethod
    def validate_valid_word(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError('Valid word cannot be empty')
        return v.strip()


class WebsiteUpdate(BaseModel):
    url: Optional[str] = None
    name: Optional[str] = None
    valid_word: Optional[str] = None
    timeout: Optional[int] = Field(default=None, ge=1, le=300)
    telegram_chat_id: Optional[str] = None
    check_interval: Optional[int] = Field(default=None, ge=60, le=3600)
    is_active: Optional[bool] = None


class WebsiteResponse(BaseModel):
    id: int
    url: str
    name: Optional[str]
    valid_word: str
    timeout: int
    telegram_chat_id: Optional[str]
    check_interval: int
    is_active: bool
    status: str
    response_time: Optional[float]
    error_message: Optional[str]
    last_check: Optional[datetime]
    total_checks: int
    failed_checks: int
    consecutive_failures: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class WebsiteListResponse(BaseModel):
    """Ответ со списком сайтов и пагинацией"""
    items: List[WebsiteResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class WebsiteStatsResponse(BaseModel):
    """Статистика по сайту"""
    website_id: int
    uptime_percentage: float
    average_response_time: Optional[float]
    total_checks: int
    failed_checks: int
    last_24h_checks: int
    last_24h_failures: int


class WebsiteCheckResponse(BaseModel):
    """История проверки сайта"""
    id: int
    website_id: int
    status: str
    response_time: Optional[float]
    status_code: Optional[int]
    error_message: Optional[str]
    checked_at: datetime

    class Config:
        from_attributes = True