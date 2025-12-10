from __future__ import annotations

from dataclasses import dataclass
from typing import List, Set

from app.schemas.fsm import FSMDefinition


@dataclass
class ValidationIssue:
    message: str
    level: str = "error"  # "error" | "warning"

class FSMValidationError(Exception):
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("FSM validation failed")

ALLOWED_LIFT_STATES = {
    "idle_closed",
    "door_opening",
    "door_open",
    "door_closing",
    "moving_up",
    "moving_down",
}

SUPPORTED_SIGNALS = {
    "call_received",
    "door_timer_expired",
    "arrived_at_floor",
    "obstacle_detected",
    "tick",
    "",
    "*",
    "always",
}


def validate_fsm_structure(fsm: FSMDefinition) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []

    if not fsm.states:
        issues.append(ValidationIssue("FSM must contain at least one state"))
        return issues

    if not any(st.is_initial for st in fsm.states):
        issues.append(ValidationIssue("FSM must contain at least one initial state"))

    state_ids: Set[str] = {st.id for st in fsm.states}

    for tr in fsm.transitions:
        if tr.from_state_id not in state_ids:
            issues.append(
                ValidationIssue(
                    f"Transition {tr.id} has invalid from_state_id={tr.from_state_id}"
                )
            )
        if tr.to_state_id not in state_ids:
            issues.append(
                ValidationIssue(
                    f"Transition {tr.id} has invalid to_state_id={tr.to_state_id}"
                )
            )

    # Reachability check (warning)
    initial_states = [st.id for st in fsm.states if st.is_initial]
    if initial_states:
        reachable: Set[str] = set(initial_states)
        changed = True
        while changed:
            changed = False
            for tr in fsm.transitions:
                if tr.from_state_id in reachable and tr.to_state_id not in reachable:
                    reachable.add(tr.to_state_id)
                    changed = True

        unreachable = state_ids - reachable
        if unreachable:
            issues.append(
                ValidationIssue(
                    f"Unreachable states from initial: {', '.join(sorted(unreachable))}",
                    level="warning",
                )
            )

    # Safety invariants: запрещаем прямой переход из открытых дверей в движение
    open_states = {"doors_open", "doors_opening"}
    moving_states = {"moving_up", "moving_down"}
    for tr in fsm.transitions:
        if tr.from_state_id.lower() in open_states and tr.to_state_id.lower() in moving_states:
            issues.append(
                ValidationIssue(
                    f"Unsafe transition {tr.id}: from {tr.from_state_id} to {tr.to_state_id} (doors open -> moving)"
                )
            )

    return issues


def validate_fsm_for_export(fsm: FSMDefinition) -> None:
    errors: List[str] = []

    if not fsm.states:
        errors.append("FSM: нет ни одного состояния")
    else:
        initial_states = [st for st in fsm.states if st.is_initial]
        if len(initial_states) == 0:
            errors.append("FSM: нет начального состояния")
        if len(initial_states) > 1:
            errors.append("FSM: больше одного начального состояния")

        seen_state_ids: Set[str] = set()
        for st in fsm.states:
            if not st.id or not st.id.strip():
                errors.append("FSM: найдено состояние с пустым id")
            if st.id in seen_state_ids:
                errors.append(f"FSM: дублирующийся id состояния '{st.id}'")
            seen_state_ids.add(st.id)
            if st.id.lower() not in ALLOWED_LIFT_STATES:
                errors.append(
                    f"FSM содержит неизвестное состояние '{st.id}'. Допустимые: {', '.join(sorted(ALLOWED_LIFT_STATES))}"
                )

        seen_transition_ids: Set[str] = set()
        for tr in fsm.transitions:
            if not tr.id or not tr.id.strip():
                errors.append("FSM: найден переход с пустым id")
            if tr.id in seen_transition_ids:
                errors.append(f"FSM: дублирующийся id перехода '{tr.id}'")
            seen_transition_ids.add(tr.id)

            if tr.from_state_id not in seen_state_ids:
                errors.append(
                    f"FSM: переход {tr.id} ссылается на неизвестное from_state_id '{tr.from_state_id}'"
                )
            if tr.to_state_id not in seen_state_ids:
                errors.append(
                    f"FSM: переход {tr.id} ссылается на неизвестное to_state_id '{tr.to_state_id}'"
                )

            cond = (tr.condition or "").strip().lower()
            if cond not in SUPPORTED_SIGNALS:
                errors.append(
                    f"FSM: переход {tr.id} использует неподдерживаемое условие '{tr.condition}'"
                )

    if errors:
        raise FSMValidationError(errors)
