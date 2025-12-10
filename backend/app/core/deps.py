# app/core/deps.py
from __future__ import annotations

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.db.session import get_db
from app import models
from app.core.config import settings
from app.core.security import ALGORITHM
from app.schemas.user import TokenPayload
from app.models.project import UserRole as SAUserRole  # SQLAlchemy enum


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db_dep() -> Generator[Session, None, None]:
    """Просто обёртка, чтобы использовать в зависимостях."""
    db = get_db()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось авторизоваться",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        token_data = TokenPayload(sub=str(sub))
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).get(int(token_data.sub))  # type: ignore[arg-type]
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def get_current_teacher(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if current_user.role != SAUserRole.teacher and current_user.role != SAUserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуется роль преподавателя",
        )
    return current_user
