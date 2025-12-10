# app/api/v1/endpoints/users.py
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.db.session import get_db
from app.core.deps import get_current_teacher, get_current_user

router = APIRouter()


@router.get("/students", response_model=List[schemas.User])
def list_students(
    db: Session = Depends(get_db),
    current_teacher: models.User = Depends(get_current_teacher),
):
    """
    Список всех пользователей с ролью student (только для преподавателей).
    """
    students = (
        db.query(models.User)
        .filter(models.User.role == models.UserRole.student)
        .order_by(models.User.id)
        .all()
    )
    return students


@router.get("/me", response_model=schemas.User)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
):
    """
    Возвращает данные текущего пользователя.
    """
    return current_user
