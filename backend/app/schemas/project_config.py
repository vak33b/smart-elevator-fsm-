from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from .fsm import FSMDefinition
from .scenario import ElevatorConfig, Scenario


class ProjectConfig(BaseModel):
    """
    Структурированное описание конфигурации проекта:
    - elevator: параметры лифта
    - fsm: описание автомата
    - default_scenario: сценарий по умолчанию (для симуляции из проекта)
    """

    elevator: ElevatorConfig
    fsm: FSMDefinition
    default_scenario: Optional[Scenario] = None
