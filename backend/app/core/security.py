# backend/app/core/security.py
from __future__ import annotations

import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt

from app.core.config import settings  # ВАЖНО: именно settings, а не Settings

# -------------------
# Работа с паролями
# -------------------

MAX_BCRYPT_BYTES = 72


def _prepare_password_bytes(password: str) -> bytes:
    """
    Приводим пароль к bytes и обрезаем до 72 байт,
    как того требует спецификация bcrypt.
    """
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > MAX_BCRYPT_BYTES:
        pw_bytes = pw_bytes[:MAX_BCRYPT_BYTES]
    return pw_bytes


def get_password_hash(password: str) -> str:
    pw_bytes = _prepare_password_bytes(password)
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pw_bytes = _prepare_password_bytes(plain_password)
    try:
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        # На случай, если хэш повреждён
        return False


# -------------------
# JWT-токены
# -------------------

ALGORITHM = "HS256"


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    expire = datetime.utcnow() + expires_delta
    to_encode = {"sub": subject, "exp": expire}

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return encoded_jwt
