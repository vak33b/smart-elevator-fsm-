# app/schemas/review.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from pydantic import ConfigDict
from app.schemas.user import User


class ProjectReviewBase(BaseModel):
    comment: str = Field(..., max_length=4000, description="Текст рецензии")


class ProjectReviewCreate(ProjectReviewBase):
    """Тело запроса при создании рецензии преподавателем."""
    pass


class ProjectReviewInDBBase(ProjectReviewBase):
    id: int
    project_id: int
    teacher_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectReview(ProjectReviewInDBBase):
    """То, что отдаём наружу."""
    teacher: Optional[User] = None
