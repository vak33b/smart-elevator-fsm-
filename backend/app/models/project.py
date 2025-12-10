# app/models/project.py
from __future__ import annotations

from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class ProjectStatus(enum.Enum):
    draft = "draft"
    submitted = "submitted"
    reviewed = "reviewed"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SqlEnum(ProjectStatus, name="project_status"),
        nullable=False,
        server_default=ProjectStatus.draft.value,
    )
    # сюда складываем конфиг лифта + FSM + сценарии и т.п. (чистый JSON)
    config = Column(JSONB, nullable=True)

    # ВЛАДЕЛЕЦ ПРОЕКТА (обычно студент)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # связи
    owner = relationship("User", back_populates="projects")
    reviews = relationship(
        "ProjectReview",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)

    role = Column(
        SqlEnum(UserRole, name="user_role"),
        nullable=False,
        server_default="student",
    )

    is_active = Column(Boolean, nullable=False, server_default="true")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Проекты, которыми владеет пользователь (обычно студент)
    projects = relationship(
        "Project",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    # Рецензии, которые пользователь оставил как преподаватель
    given_reviews = relationship(
        "ProjectReview",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )


class ProjectReview(Base):
    """
    Рецензия на проект: кто (teacher) что написал про какой проект.
    """

    __tablename__ = "project_reviews"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    comment = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project = relationship("Project", back_populates="reviews")
    teacher = relationship("User", back_populates="given_reviews")
