from pydantic import BaseModel


class Token(BaseModel):
    """Схема токена"""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
