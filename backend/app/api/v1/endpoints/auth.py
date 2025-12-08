# backend/app/api/v1/endpoints/auth.py
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app import models
from app.db.session import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from app.schemas.user import User, UserCreate, Token

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register", response_model=User)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # проверка email
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

    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        # роль и is_active берутся из дефолтов в модели
        role=models.UserRole[user_in.role.value],
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Логин по JSON-у:
    {
      "email": "user@example.com",
      "password": "string123"
    }
    """
    user = (
        db.query(models.User)
        .filter(models.User.email == body.email)
        .first()
    )
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный email или пароль",
        )

    access_token = create_access_token(str(user.id))
    return Token(access_token=access_token)
