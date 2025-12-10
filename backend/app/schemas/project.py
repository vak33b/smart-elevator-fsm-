from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, Any, Dict, List

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.scenario import Scenario
from app.schemas.fsm import FSMDefinition
from app.schemas.user import User as UserSchema


class ProjectStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    reviewed = "reviewed"


class ElevatorConfig(BaseModel):
    """
    Конфигурация лифта, которая хранится в Project.config.elevator
    и приходит в симуляцию.
    """
    floors: int = Field(..., gt=0, description="Количество этажей")
    door_time: float = Field(
        ...,
        gt=0,
        description="Время полного цикла дверей (от закрытых до закрытых)",
    )
    move_time: float = Field(
        ...,
        gt=0,
        description="Время перемещения между соседними этажами",
    )
    capacity: int = Field(..., gt=0, description="Вместимость лифта")


class ProjectConfig(BaseModel):
    """
    Полная конфигурация проекта, которая лежит в Project.config.
    """
    elevator: ElevatorConfig
    fsm: FSMDefinition
    default_scenario: Optional[Scenario] = None


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    config: Optional[ProjectConfig] = None
    status: ProjectStatus = Field(default=ProjectStatus.draft)
    owner_id: Optional[int] = Field(
        default=None,
        description="ID пользователя-владельца (студента)",
    )



class ProjectCreate(ProjectBase):
    """
    Создание проекта.

    owner_id:
    - студент вообще не указывает (ставим ему current_user.id на бэке)
    - преподаватель может создать проект от имени студента
    """
    owner_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[ProjectStatus] = None

    # преподаватель может менять владельца проекта
    owner_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectInDBBase(ProjectBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



class Project(ProjectInDBBase):
    """
    Модель, которая используется в response_model для /projects.
    """
    owner: Optional[UserSchema] = None


class ProjectExport(BaseModel):
    """
    JSON для экспорта/импорта проекта без БД-метаданных.
    """

    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.draft
    config: Optional[ProjectConfig] = None


class ProjectImport(ProjectCreate):
    """
    Данные для импорта проекта из JSON-файла.
    """

    pass


# Ниже можешь оставить ExternalEventType/ExternalEvent, если они нужны позже,
# но они не влияют на работу текущих эндпоинтов.

class ExternalEventType(str, Enum):
    """Тип внешнего события, которое поступает на автомат."""
    CALL_BUTTON_PRESSED = "call_button_pressed"       # нажали кнопку вызова на этаже
    CABIN_BUTTON_PRESSED = "cabin_button_pressed"     # нажали кнопку внутри кабины
    DOOR_TIMER_EXPIRED = "door_timer_expired"         # истёк таймер дверей
    ARRIVED_AT_FLOOR = "arrived_at_floor"             # лифт прибыл на этаж
    OBSTACLE_DETECTED = "obstacle_detected"           # помеха при закрытии дверей
    TICK = "tick"                                     # внутренний шаг симуляции (если пригодится)


class ExternalEvent(BaseModel):
    time: float = Field(..., ge=0, description="Момент времени в секундах")
    type: ExternalEventType
    floor: Optional[int] = Field(
        None,
        description="Этаж, к которому относится событие (если применимо)",
    )

# ---------- РЕЦЕНЗИИ НА ПРОЕКТЫ ----------

class ProjectReviewBase(BaseModel):
    comment: str


class ProjectReviewCreate(ProjectReviewBase):
    """
    То, что приходит от клиента при создании рецензии.
    Сейчас нам нужен только текст комментария.
    """
    pass


class ProjectReviewInDBBase(ProjectReviewBase):
    id: int
    project_id: int
    teacher_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class ProjectReview(ProjectReviewInDBBase):
    """
    То, что отдаем наружу:
    id, project_id, teacher_id, comment, created_at.
    """
    pass
