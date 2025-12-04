from sqlalchemy.orm import declarative_base

Base = declarative_base()

# импорт моделей, чтобы Alembic видел таблицы
from app.models.project import Project  # noqa: F401,E402
