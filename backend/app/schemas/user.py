# backend/app/schemas/user.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    """Роль пользователя в системе."""
    STUDENT = "student"
    TEACHER = "teacher"


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="E-mail пользователя")
    full_name: Optional[str] = Field(
        default=None,
        description="Полное имя пользователя",
    )
    role: UserRole = Field(
        default=UserRole.STUDENT,
        description="Роль пользователя (student / teacher)",
    )
    is_active: bool = Field(
        default=True,
        description="Флаг активности пользователя",
    )


class UserCreate(UserBase):
    # ВАЖНО: bcrypt поддерживает только первые 72 байта.
    # Ограничиваем длину пароля, чтобы не ловить ValueError.
    password: str = Field(
        ...,
        min_length=6,
        max_length=72,
        description="Пароль (до 72 символов, из-за ограничений bcrypt)",
    )


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=72,
        description="Новый пароль (опционально, до 72 символов)",
    )

    class Config:
        orm_mode = True


class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class User(UserInDBBase):
    """То, что возвращаем наружу (без пароля)."""
    pass


class UserInDB(UserInDBBase):
    """Внутренняя модель (включает хеш пароля)."""
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None  # user_id в строковом виде
    role: Optional[UserRole] = None
