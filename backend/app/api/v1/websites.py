from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.db.session import get_async_session
from app.models.user import User
from app.models.website import Website
from app.schemas.website import (
    WebsiteCreate,
    WebsiteUpdate,
    WebsiteResponse
)
from app.api.deps import get_current_user
from app.core.logger import get_logger

router = APIRouter()
logger = get_logger("api.websites")


@router.post("/", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
async def create_website(
        website_data: WebsiteCreate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Create a new website to monitor"""

    new_website = Website(
        user_id=current_user.id,
        url=website_data.url,
        name=website_data.name,
        valid_word=website_data.valid_word,
        timeout=website_data.timeout,
        status="pending"
    )

    db.add(new_website)
    await db.commit()
    await db.refresh(new_website)

    logger.info(f"Website {new_website.id} created by user {current_user.id}")
    return new_website


@router.get("/", response_model=List[WebsiteResponse])
async def get_websites(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Get all websites for the current user"""

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
    """Get a specific website"""

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
    """Update website monitoring settings"""

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

    # Update fields
    update_data = website_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(website, field, value)

    await db.commit()
    await db.refresh(website)

    logger.info(f"Website {website_id} updated by user {current_user.id}")
    return website


@router.delete("/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_website(
        website_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_session)
):
    """Delete a website"""

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

    await db.execute(
        delete(Website).where(Website.id == website_id)
    )
    await db.commit()

    logger.info(f"Website {website_id} deleted by user {current_user.id}")
