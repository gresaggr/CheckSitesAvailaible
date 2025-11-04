from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_
from typing import List
from datetime import datetime, timedelta

from app.db.session import get_async_session
from app.models.user import User
from app.models.website import Website, WebsiteCheck
from app.schemas.website import (
    WebsiteCreate,
    WebsiteUpdate,
    WebsiteResponse,
    WebsiteStatsResponse,
    WebsiteCheckResponse
)
from app.api.deps import get_current_user
from app.core.logger import get_logger
from app.tasks.monitor import check_website, stop_website_monitoring
from app.services.telegram import validate_telegram_chat_id

router = APIRouter()
logger = get_logger("api.websites")


@router.post("/", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
async def create_website(
        website_data: WebsiteCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Создать новый сайт для мониторинга"""

    # Проверяем Telegram chat ID если указан
    if website_data.telegram_chat_id:
        is_valid = await validate_telegram_chat_id(website_data.telegram_chat_id)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Telegram chat ID. Make sure you've started the bot."
            )

    new_website = Website(
        user_id=current_user.id,
        url=website_data.url,
        name=website_data.name,
        valid_word=website_data.valid_word,
        timeout=website_data.timeout,
        telegram_chat_id=website_data.telegram_chat_id,
        check_interval=website_data.check_interval,
        status="pending"
    )

    db.add(new_website)
    await db.commit()
    await db.refresh(new_website)

    # Запускаем первую проверку асинхронно
    check_website.delay(new_website.id)

    logger.info(f"Website {new_website.id} created by user {current_user.id}")
    return new_website


@router.get("/", response_model=List[WebsiteResponse])
async def get_websites(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Получить все сайты текущего пользователя"""

    result = await db.execute(
        select(Website).where(Website.user_id == current_user.id)
    )
    websites = result.scalars().all()

    return websites


@router.get("/{website_id}", response_model=WebsiteResponse)
async def get_website(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Получить конкретный сайт"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    return website


@router.patch("/{website_id}", response_model=WebsiteResponse)
async def update_website(
        website_id: int,
        website_data: WebsiteUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Обновить настройки мониторинга сайта"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Проверяем новый Telegram chat ID если он обновляется
    if website_data.telegram_chat_id is not None:
        is_valid = await validate_telegram_chat_id(website_data.telegram_chat_id)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Telegram chat ID"
            )

    # Обновляем поля
    update_data = website_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(website, field, value)

    await db.commit()
    await db.refresh(website)

    logger.info(f"Website {website_id} updated by user {current_user.id}")
    return website


@router.post("/{website_id}/stop", response_model=WebsiteResponse)
async def stop_website(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Остановить мониторинг сайта"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Останавливаем мониторинг через Celery
    stop_website_monitoring.delay(website_id)

    website.status = "stopped"
    website.is_active = False
    await db.commit()
    await db.refresh(website)

    logger.info(f"Website {website_id} stopped by user {current_user.id}")
    return website


@router.post("/{website_id}/start", response_model=WebsiteResponse)
async def start_website(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Запустить мониторинг сайта"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    website.status = "pending"
    website.is_active = True
    website.consecutive_failures = 0
    await db.commit()
    await db.refresh(website)

    # Запускаем проверку
    check_website.delay(website_id)

    logger.info(f"Website {website_id} started by user {current_user.id}")
    return website


@router.post("/{website_id}/check-now", response_model=WebsiteResponse)
async def check_website_now(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Запустить немедленную проверку сайта"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Запускаем проверку
    check_website.delay(website_id)

    logger.info(f"Manual check triggered for website {website_id}")
    return website


@router.delete("/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_website(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Удалить сайт"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Останавливаем мониторинг
    stop_website_monitoring.delay(website_id)

    # Удаляем из БД
    await db.execute(
        delete(Website).where(Website.id == website_id)
    )
    await db.commit()

    logger.info(f"Website {website_id} deleted by user {current_user.id}")


@router.get("/{website_id}/stats", response_model=WebsiteStatsResponse)
async def get_website_stats(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Получить статистику по сайту"""

    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Статистика за последние 24 часа
    last_24h = datetime.utcnow() - timedelta(hours=24)

    result_24h = await db.execute(
        select(
            func.count(WebsiteCheck.id).label("total"),
            func.sum(
                func.case((WebsiteCheck.status != "online", 1), else_=0)
            ).label("failures")
        ).where(
            and_(
                WebsiteCheck.website_id == website_id,
                WebsiteCheck.checked_at >= last_24h
            )
        )
    )
    stats_24h = result_24h.first()

    # Средний response time
    result_avg = await db.execute(
        select(func.avg(WebsiteCheck.response_time)).where(
            and_(
                WebsiteCheck.website_id == website_id,
                WebsiteCheck.response_time.isnot(None)
            )
        )
    )
    avg_response = result_avg.scalar()

    # Uptime percentage
    uptime = 0.0
    if website.total_checks > 0:
        uptime = ((website.total_checks - website.failed_checks) / website.total_checks) * 100

    return WebsiteStatsResponse(
        website_id=website_id,
        uptime_percentage=round(uptime, 2),
        average_response_time=round(avg_response, 2) if avg_response else None,
        total_checks=website.total_checks,
        failed_checks=website.failed_checks,
        last_24h_checks=stats_24h.total or 0,
        last_24h_failures=stats_24h.failures or 0
    )


@router.get("/{website_id}/history", response_model=List[WebsiteCheckResponse])
async def get_website_history(
        website_id: int,
        limit: int = Query(default=100, le=1000),
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Получить историю проверок сайта"""

    # Проверяем что сайт принадлежит пользователю
    result = await db.execute(
        select(Website).where(
            Website.id == website_id,
            Website.user_id == current_user.id
        )
    )
    website = result.scalar_one_or_none()

    if not website:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Website not found"
        )

    # Получаем историю
    result = await db.execute(
        select(WebsiteCheck)
        .where(WebsiteCheck.website_id == website_id)
        .order_by(WebsiteCheck.checked_at.desc())
        .limit(limit)
    )
    checks = result.scalars().all()

    return checks
