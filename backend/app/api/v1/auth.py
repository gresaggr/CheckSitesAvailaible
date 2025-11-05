from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.db.session import get_async_session
from app.models import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserUpdate
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.logger import get_logger
from app.services.telegram import validate_telegram_chat_id

router = APIRouter()
logger = get_logger("api.auth")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_async_session)):
    """Register a new user"""

    # Check if email exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        balance=0.0
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"New user registered: {new_user.email}")
    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_async_session)):
    """Login and get access token - использует EMAIL для входа"""

    # Ищем пользователя по EMAIL
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    logger.info(f"User logged in: {user.email}")

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
        current_user: User = Depends(get_current_user)
):
    """Получение информации о текущем пользователе"""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
        user_data: UserUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Update current user profile"""

    # Validate telegram chat ID if provided
    if user_data.default_telegram_chat_id is not None:
        if user_data.default_telegram_chat_id:  # Only validate if not empty
            is_valid = await validate_telegram_chat_id(user_data.default_telegram_chat_id)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Telegram chat ID. Make sure you've started the bot."
                )
        current_user.default_telegram_chat_id = user_data.default_telegram_chat_id or None

    await db.commit()
    await db.refresh(current_user)

    logger.info(f"User {current_user.id} profile updated")
    return current_user
