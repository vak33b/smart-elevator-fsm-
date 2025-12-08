from app.db.base import Base  # noqa

from .project import Project, User, UserRole  # + если есть другие модели

__all__ = ["Project", "User", "UserRole"]