from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db.session import get_async_session
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


class BalanceResponse(BaseModel):
    balance: float


class TopUpRequest(BaseModel):
    amount: float


@router.get("/", response_model=BalanceResponse)
async def get_balance(current_user: User = Depends(get_current_user)):
    """Get current user balance"""
    return BalanceResponse(balance=current_user.balance)


@router.post("/topup", response_model=BalanceResponse)
async def topup_balance(
    topup_data: TopUpRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Top up balance (stub - payment integration needed)"""
    # TODO: Implement payment gateway integration
    # For now, just add the amount directly
    
    current_user.balance += topup_data.amount
    await db.commit()
    await db.refresh(current_user)
    
    return BalanceResponse(balance=current_user.balance)