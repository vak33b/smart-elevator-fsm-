from __future__ import annotations

from typing import List, Dict, Any

from app.schemas.simulation import (
    SimulationRequest,
    SimulationResult,
    TimelineItem,
    SimulationMetrics,
)
from app.schemas.scenario import Direction
from app.schemas.fsm import FSMDefinition, FSMState, FSMTransition
from app.services.fsm_validation import validate_fsm_structure, ValidationIssue


class SimulationValidationError(Exception):
    def __init__(self, errors: List[Dict[str, Any]], message: str = "Simulation validation failed"):
        self.errors = errors
        self.message = message
        super().__init__(message)


ALLOWED_MOVING_STATES = {"moving_up", "moving_down"}
OPEN_STATES = {"doors_open", "doors_opening"}


def _get_initial_state(fsm: FSMDefinition) -> FSMState:
    for st in fsm.states:
        if st.is_initial:
            return st
    return fsm.states[0]


def _build_state_map(fsm: FSMDefinition) -> Dict[str, FSMState]:
    return {st.id: st for st in fsm.states}


def _is_condition_satisfied(condition: str, context: Dict[str, object]) -> bool:
    cond = (condition or "").strip().lower()
    if cond in ("", "*", "always"):
        return True
    if cond in context:
        return bool(context[cond])
    return False


def _choose_transition(
    transitions: List[FSMTransition],
    current_state: FSMState,
    event_type: str,
    context: Dict[str, object],
) -> FSMTransition | None:
    for tr in transitions:
        if tr.from_state_id != current_state.id:
            continue
        if tr.event_type is not None and tr.event_type.value != event_type:
            continue
        if _is_condition_satisfied(tr.condition, context):
            return tr
    return None


def _validate_or_raise(fsm: FSMDefinition) -> None:
    issues = validate_fsm_structure(fsm)
    errors = [i for i in issues if i.level == "error"]
    if errors:
        raise SimulationValidationError(
            [{"detail": err.message, "kind": "fsm"} for err in errors]
        )


# ===== Основная симуляция =====

def simulate(request: SimulationRequest) -> SimulationResult:
    events = sorted(request.scenario.events, key=lambda e: e.time)
    fsm = request.fsm
    config = request.config

    _validate_or_raise(fsm)

    if not events:
        return SimulationResult(
            timeline=[],
            metrics=SimulationMetrics(
                avg_wait_time=0.0,
                total_moves=0,
                stops=0,
            ),
        )

    state_map = _build_state_map(fsm)
    current_state = _get_initial_state(fsm)

    current_floor = 0
    current_time: float = 0.0

    total_moves = 0
    total_wait_time = 0.0
    stops = 0

    timeline: List[TimelineItem] = [
        TimelineItem(
          time=int(round(current_time)),
          floor=current_floor,
          state_id=current_state.id,
          doors_open=False,
          direction=Direction.NONE,
        )
    ]

    move_time = float(config.move_time)
    door_time = float(config.door_time)

    for ev in events:
        context: Dict[str, object] = {
            "floor": ev.floor,
            "direction": ev.direction.value,
            "event_type": ev.type.value,
        }

        transition = _choose_transition(fsm.transitions, current_state, ev.type.value, context)
        if transition is None:
            raise SimulationValidationError([
                {
                    "detail": "нет подходящего перехода в FSM",
                    "time": ev.time,
                    "event_type": ev.type.value,
                    "state_id": current_state.id,
                }
            ])

        if transition.to_state_id not in state_map:
            raise SimulationValidationError([
                {
                    "detail": f"Transition {transition.id} указывает на неизвестное состояние",
                    "transition_id": transition.id,
                }
            ])

        new_state = state_map[transition.to_state_id]

        # Safety: запрещаем doors_open/doors_opening -> moving
        if current_state.id.lower() in OPEN_STATES and new_state.id.lower() in ALLOWED_MOVING_STATES:
            raise SimulationValidationError([
                {
                    "detail": f"Недопустимый переход {transition.id}: {current_state.id} -> {new_state.id}",
                    "transition_id": transition.id,
                }
            ])

        event_time = float(ev.time)
        current_time = max(current_time, event_time)

        direction = Direction.NONE
        if new_state.id.lower() == "moving_up":
            direction = Direction.UP
        elif new_state.id.lower() == "moving_down":
            direction = Direction.DOWN

        if new_state.id.lower() in ALLOWED_MOVING_STATES:
            target_floor = ev.floor
            floor_diff = abs(target_floor - current_floor)
            travel_time = floor_diff * move_time

            timeline.append(
                TimelineItem(
                    time=int(round(current_time)),
                    floor=current_floor,
                    state_id=new_state.id,
                    doors_open=False,
                    direction=direction,
                )
            )

            total_moves += floor_diff
            wait_time = (current_time - ev.time) + travel_time
            total_wait_time += max(wait_time, 0.0)
            stops += 1

            current_time += travel_time
            current_floor = target_floor

            # после прибытия: открыть/закрыть двери (через стандартные состояния)
            opening_time = current_time
            timeline.append(
                TimelineItem(
                    time=int(round(opening_time)),
                    floor=current_floor,
                    state_id="doors_opening",
                    doors_open=False,
                    direction=Direction.NONE,
                )
            )
            open_time = opening_time + door_time * 0.25
            timeline.append(
                TimelineItem(
                    time=int(round(open_time)),
                    floor=current_floor,
                    state_id="doors_open",
                    doors_open=True,
                    direction=Direction.NONE,
                )
            )
            closing_time = open_time + door_time * 0.5
            timeline.append(
                TimelineItem(
                    time=int(round(closing_time)),
                    floor=current_floor,
                    state_id="doors_closing",
                    doors_open=False,
                    direction=Direction.NONE,
                )
            )
            idle_time = closing_time + door_time * 0.25
            timeline.append(
                TimelineItem(
                    time=int(round(idle_time)),
                    floor=current_floor,
                    state_id="idle_closed",
                    doors_open=False,
                    direction=Direction.NONE,
                )
            )
            current_time = idle_time

            # остаёмся в состоянии idle (если оно определено) иначе moving
            current_state = state_map.get("idle_closed", new_state)
        else:
            doors_open = new_state.id.lower() == "doors_open"
            timeline.append(
                TimelineItem(
                    time=int(round(current_time)),
                    floor=current_floor,
                    state_id=new_state.id,
                    doors_open=doors_open,
                    direction=direction,
                )
            )
            current_state = new_state

    avg_wait_time = total_wait_time / stops if stops > 0 else 0.0

    metrics = SimulationMetrics(
        avg_wait_time=avg_wait_time,
        total_moves=total_moves,
        stops=stops,
    )

    return SimulationResult(timeline=timeline, metrics=metrics)


def enrich_timeline_with_fsm_states(
    timeline: List[Dict[str, Any]],
    door_time: float,
) -> List[Dict[str, Any]]:
    # Текущее поведение оставляем без изменений — функция больше не преобразует состояния
    return timeline
