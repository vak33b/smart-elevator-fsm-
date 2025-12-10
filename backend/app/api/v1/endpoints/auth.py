# backend/app/api/v1/endpoints/auth.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app import models, schemas
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)

router = APIRouter()


# ---------- СХЕМА ДЛЯ ЛОГИНА (JSON) ----------

class LoginRequest(BaseModel):
  email: EmailStr
  password: str


# ---------- РЕГИСТРАЦИЯ ----------

@router.post(
    "/register",
    response_model=schemas.User,
    status_code=status.HTTP_201_CREATED,
)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя.

    Ожидает JSON по схеме UserCreate:
    {
      "email": "...",
      "full_name": "...",
      "role": "student" | "teacher",
      "password": "...",
      "is_active": true
    }
    """
    existing = (
        db.query(models.User)
        .filter(models.User.email == user_in.email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    # Маппим pydantic-роль -> SQLAlchemy Enum
    if user_in.role == schemas.UserRole.TEACHER:
        db_role = models.UserRole.teacher
    else:
        db_role = models.UserRole.student

    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role=db_role,
        is_active=user_in.is_active,
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ---------- ЛОГИН ----------

@router.post(
    "/login",
    response_model=schemas.AuthResponse,
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Принимаем JSON:
    {
      "email": "...",
      "password": "..."
    }
    Возвращаем:
    - access_token
    - user (с full_name, role и т.д.)
    """
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный email или пароль",
        )

    access_token = create_access_token(str(user.id))

    # ВАЖНО: заворачиваем SQLAlchemy-модель в pydantic-схему User,
    # чтобы гарантированно получить правильный JSON.
    user_schema = schemas.User.model_validate(user)

    return schemas.AuthResponse(
        access_token=access_token,
        user=user_schema,
    )
