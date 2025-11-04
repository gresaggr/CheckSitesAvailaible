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
    timeout = Column(Integer, default=30)  # seconds
    
    # Status
    is_active = Column(Boolean, default=True)
    last_check = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="pending")  # pending, online, offline, error
    response_time = Column(Float, nullable=True)  # milliseconds
    error_message = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="websites")
