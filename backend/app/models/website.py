from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Website(Base):
    __tablename__ = "websites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Website details
    url = Column(String, nullable=False)
    name = Column(String, nullable=True)
    valid_word = Column(String, nullable=False)
    timeout = Column(Integer, default=30)
    telegram_chat_id = Column(String, nullable=True)  # NEW: Telegram ID для уведомлений

    # Monitoring settings
    check_interval = Column(Integer, default=300)  # NEW: Интервал проверки в секундах (5 мин)
    is_active = Column(Boolean, default=True)

    # Status
    last_check = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")  # pending, online, offline, error, stopped
    response_time = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)

    # Statistics
    total_checks = Column(Integer, default=0)  # NEW: Всего проверок
    failed_checks = Column(Integer, default=0)  # NEW: Неудачных проверок
    last_notification_sent = Column(DateTime(timezone=True), nullable=True)  # NEW: Последнее уведомление
    consecutive_failures = Column(Integer, default=0)  # NEW: Последовательных сбоев

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="websites")
    checks = relationship("WebsiteCheck", back_populates="website", cascade="all, delete-orphan")


class WebsiteCheck(Base):
    """История проверок сайтов"""
    __tablename__ = "website_checks"

    id = Column(Integer, primary_key=True, index=True)
    website_id = Column(Integer, ForeignKey("websites.id", ondelete="CASCADE"), nullable=False)

    status = Column(String, nullable=False)  # online, offline, error
    response_time = Column(Float, nullable=True)
    status_code = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    website = relationship("Website", back_populates="checks")
