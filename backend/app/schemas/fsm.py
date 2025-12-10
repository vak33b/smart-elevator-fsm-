from __future__ import annotations

from enum import Enum
from typing import Any, Optional, Set

from pydantic import BaseModel, Field, model_validator
from app.schemas.scenario import ScenarioEventType


class FSMType(str, Enum):
    MEALY = "mealy"
    MOORE = "moore"


class FSMState(BaseModel):
    id: str = Field(..., description="Уникальный ID состояния")
    name: str = Field(..., description="Человекочитаемое имя состояния")
    is_initial: bool = False
    is_final: bool = False
    outputs: Optional[dict[str, Any]] = Field(
        default=None,
        description="Выходные сигналы для автомата Мура (или доп.данные)",
    )


class FSMTransition(BaseModel):
    id: str = Field(..., description="Уникальный ID перехода")
    from_state_id: str
    to_state_id: str
    condition: str = Field(
        "",
        description=(
            "Условие перехода. "
            "Если пусто / '*' / 'always' — переход безусловный. "
            "Если строка совпадает с именем входного сигнала, "
            "то переход выполняется, когда этот сигнал == True."
        ),
    )
    event_type: Optional[ScenarioEventType] = Field(
        default=None,
        description="Тип события сценария, на которое реагирует переход. None — реагирует на любое.",
    )
    actions: Optional[dict[str, Any]] = Field(
        default=None,
        description="Действия при переходе (например, установка сигналов)",
    )


class FSMVerilogExportRequest(BaseModel):
    module_name: Optional[str] = None


class FSMVerilogExport(BaseModel):
    project_id: int
    module_name: str
    verilog: str


class FSMDefinition(BaseModel):
    type: FSMType = FSMType.MEALY
    states: list[FSMState]
    transitions: list[FSMTransition]

    @model_validator(mode="after")
    def validate_fsm(self) -> "FSMDefinition":
        if not self.states:
            raise ValueError("FSM must contain at least one state")

        # Проверяем, что есть хотя бы одно начальное состояние
        if not any(st.is_initial for st in self.states):
            raise ValueError("FSM must contain at least one initial state")

        state_ids: Set[str] = {st.id for st in self.states}

        # Проверяем, что переходы ссылаются только на существующие состояния
        for tr in self.transitions:
            if tr.from_state_id not in state_ids:
                raise ValueError(
                    f"Transition {tr.id} has invalid from_state_id={tr.from_state_id}"
                )
            if tr.to_state_id not in state_ids:
                raise ValueError(
                    f"Transition {tr.id} has invalid to_state_id={tr.to_state_id}"
                )

        return self
