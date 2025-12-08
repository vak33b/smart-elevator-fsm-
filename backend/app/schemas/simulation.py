# backend/app/schemas/simulation.py
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from app.schemas.scenario import Scenario, Direction
from app.schemas.fsm import FSMDefinition
from app.schemas.project import ElevatorConfig


class SimulationRequest(BaseModel):
    """
    Внутренний запрос симуляции: backend сам собирает его из ProjectConfig.
    """
    project_id: int
    config: ElevatorConfig
    fsm: FSMDefinition
    scenario: Scenario


class TimelineItem(BaseModel):
    time: int
    floor: int
    state_id: str
    doors_open: bool
    direction: Direction


class SimulationMetrics(BaseModel):
    avg_wait_time: float
    total_moves: int
    stops: int


class SimulationResult(BaseModel):
    timeline: List[TimelineItem]
    metrics: SimulationMetrics


class ProjectSimulationRequest(BaseModel):
    """
    То, что приходит в эндпоинт /projects/{id}/simulate с фронта.
    Все поля опциональны, можно просто отправить {}.
    """
    scenario: Optional[Scenario] = None
    config_override: Optional[ElevatorConfig] = None
