from __future__ import annotations

from enum import Enum
from typing import Optional, List, Any

from pydantic import BaseModel, Field, ValidationError


class Direction(str, Enum):
    UP = "up"
    DOWN = "down"
    NONE = "none"


class ScenarioEventType(str, Enum):
    """
    Тип внешнего события для автомата.
    Пока нам достаточно CALL, но оставляем задел.
    """
    CALL = "call"
    CABIN = "cabin"
    TIMER = "timer"
    SENSOR = "sensor"


class ScenarioEvent(BaseModel):
    """
    Одно событие сценария (вызов, таймер и т.п.).
    """
    time: int = Field(..., ge=0, description="Момент, когда поступает событие")
    floor: int = Field(..., ge=0, description="Этаж, к которому относится событие")
    direction: Direction = Direction.NONE
    # ВАЖНО: делаем поле type с дефолтом,
    # чтобы старые сценарии без этого поля валидировались как CALL.
    type: ScenarioEventType = ScenarioEventType.CALL


class Scenario(BaseModel):
    """
    Сценарий: имя + список событий.
    """
    name: Optional[str] = None
    events: List[ScenarioEvent] = Field(default_factory=list)

    @classmethod
    def model_validate(cls, obj: Any) -> "Scenario":  # type: ignore[override]
        """
        Переопределяем validate, чтобы:
        - принимать уже нормальный формат (name + events с type);
        - принимать старый формат {name, events: [{time, floor, direction}]}
          и дополнять его полем type = CALL.
        """
        try:
            # Попробуем обычную валидацию
            return super().model_validate(obj)
        except ValidationError:
            pass

        # Старый формат: { name, events: [ {time, floor, direction} ] }
        name = None
        events_raw: List[Any] = []

        if isinstance(obj, dict):
            name = obj.get("name")
            events_raw = obj.get("events", []) or []

        converted_events: List[ScenarioEvent] = []
        for ev in events_raw:
            converted_events.append(
                ScenarioEvent(
                    time=int(ev.get("time", 0)),
                    floor=int(ev.get("floor", 0)),
                    direction=Direction(ev.get("direction", "none")),
                    type=ScenarioEventType.CALL,
                )
            )

        return Scenario(name=name, events=converted_events)
