from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, Any, Dict, List

from pydantic import BaseModel, Field

from app.schemas.scenario import Scenario
from app.schemas.fsm import FSMDefinition


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


class ProjectCreate(ProjectBase):
    # всё то же, что в ProjectBase
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    # сюда приходит "сырое" config из фронта (dict)
    config: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True  # аналог orm_mode для Pydantic v2


class ProjectInDBBase(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Project(ProjectInDBBase):
    """
    Модель, которая используется в response_model для /projects.
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
