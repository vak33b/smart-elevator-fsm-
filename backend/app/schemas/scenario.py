from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Direction(str, Enum):
    UP = "up"
    DOWN = "down"
    NONE = "none"


class ElevatorConfig(BaseModel):
    floors: int = Field(..., gt=0, description="Количество этажей")
    door_time: float = Field(
        2.0,
        description="Время открытия/закрытия дверей (условные единицы/секунды)",
    )
    move_time: float = Field(
        1.0,
        description="Время перемещения между этажами",
    )
    capacity: Optional[int] = Field(
        default=None,
        description="Грузоподъёмность/количество людей (если понадобится)",
    )


class ScenarioEvent(BaseModel):
    time: int = Field(..., ge=0, description="Момент, когда поступает вызов")
    floor: int = Field(..., ge=0, description="Этаж вызова")
    direction: Direction = Direction.NONE


class Scenario(BaseModel):
    name: str = "Default scenario"
    events: list[ScenarioEvent]
