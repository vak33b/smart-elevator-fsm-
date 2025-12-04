from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.fsm import FSMDefinition
from app.schemas.scenario import ElevatorConfig, Scenario, Direction


class TimelineItem(BaseModel):
    time: int
    floor: int
    state_id: str
    doors_open: bool
    direction: Direction


class SimulationMetrics(BaseModel):
    avg_wait_time: float = 0.0
    total_moves: int = 0
    stops: int = 0


class SimulationRequest(BaseModel):
    project_id: Optional[int] = Field(
        default=None,
        description="ID проекта (опционально, для связи с сохранённым проектом)",
    )
    config: ElevatorConfig
    fsm: FSMDefinition
    scenario: Scenario


class SimulationResult(BaseModel):
    timeline: list[TimelineItem]
    metrics: SimulationMetrics


class ProjectSimulationRequest(BaseModel):

    scenario: Optional[Scenario] = None
    config_override: Optional[ElevatorConfig] = None
