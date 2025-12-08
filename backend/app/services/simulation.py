from __future__ import annotations

from typing import List, Dict, Any

from copy import deepcopy

from app.schemas.simulation import (
    SimulationRequest,
    SimulationResult,
    TimelineItem,
    SimulationMetrics,
)
from app.schemas.scenario import Direction
from app.schemas.fsm import FSMDefinition, FSMState, FSMTransition

# Разрешённые физические состояния лифта
ALLOWED_STATES = {
    "IDLE_CLOSED",
    "DOOR_OPENING",
    "DOOR_OPEN",
    "DOOR_CLOSING",
    "MOVING_UP",
    "MOVING_DOWN",
}


# ===== Вспомогательные функции для FSM (пока почти не используем) =====

def _get_initial_state(fsm: FSMDefinition) -> FSMState:
    """
    Ищем состояние, помеченное как is_initial.
    Если такого нет — берём первое в списке.
    Сейчас физику лифта мы считаем сами, но сюда можно будет
    привязать "логический" автомат по событиям.
    """
    for st in fsm.states:
        if st.is_initial:
            return st
    return fsm.states[0]


def _build_state_map(fsm: FSMDefinition) -> Dict[str, FSMState]:
    return {st.id: st for st in fsm.states}


def _is_condition_satisfied(condition: str, context: Dict[str, object]) -> bool:
    """
    Простейшая модель условий для будущей FSM-логики.
    Пока мы почти не используем её в физике лифта, но оставляем
    как задел.

    - '', '*', 'always'  -> всегда True
    - если condition совпадает с именем сигнала в context:
        -> True, если context[condition] приводится к True
    - иначе -> False
    """
    cond = (condition or "").strip().lower()

    if cond in ("", "*", "always"):
        return True

    if cond in context:
        return bool(context[cond])

    return False


def _choose_transition(
    fsm: FSMDefinition,
    current_state: FSMState,
    context: Dict[str, object],
) -> FSMTransition | None:
    """
    Заготовка под связь сценария и автомата:
    можно будет просматривать переходы и выбирать тот,
    чьё условие выполняется в текущем контексте.
    Сейчас физическое состояние лифта считаем отдельно.
    """
    for tr in fsm.transitions:
        if tr.from_state_id != current_state.id:
            continue
        if _is_condition_satisfied(tr.condition, context):
            return tr
    return None


# ===== Основная физическая симуляция лифта =====

def simulate(request: SimulationRequest) -> SimulationResult:
    """
    Симуляция лифта, ориентированная на корректные физические состояния:

    Сценарий → события (вызовы) → (пока простая политика) → последовательности
    физических состояний лифта:

    - ожидание/двери:
      IDLE_CLOSED → DOOR_OPENING → DOOR_OPEN → DOOR_CLOSING → IDLE_CLOSED

    - движение вверх:
      IDLE_CLOSED → MOVING_UP → DOOR_OPENING → DOOR_OPEN → DOOR_CLOSING → IDLE_CLOSED

    - движение вниз:
      IDLE_CLOSED → MOVING_DOWN → DOOR_OPENING → DOOR_OPEN → DOOR_CLOSING → IDLE_CLOSED

    Сценарий задаёт последовательность вызовов (этаж + время),
    А НЕ «магические прыжки» на этажи. Движение между этажами
    считается по move_time, паузы на этажах — по door_time.
    """

    events = sorted(request.scenario.events, key=lambda e: e.time)
    fsm = request.fsm
    config = request.config

    if not events:
        return SimulationResult(
            timeline=[],
            metrics=SimulationMetrics(
                avg_wait_time=0.0,
                total_moves=0,
                stops=0,
            ),
        )

    move_time = float(config.move_time)
    door_time = float(config.door_time)
    door_opening_phase = door_time * 0.25
    door_open_phase = door_time * 0.5
    door_closing_phase = door_time * 0.25

    # Логическое состояние FSM (на будущее, пока почти не используем)
    fsm_state = _get_initial_state(fsm) if fsm.states else None
    _ = _build_state_map(fsm)  # пока не используется, но пригодится позже

    # Физическое состояние лифта
    current_floor = 0
    current_time: float = 0.0

    total_moves = 0
    total_wait_time = 0.0
    stops = 0

    timeline: List[TimelineItem] = []

    # Стартовый кадр: стоим на 0 этаже, двери закрыты
    timeline.append(
        TimelineItem(
            time=int(round(current_time)),
            floor=current_floor,
            state_id="IDLE_CLOSED",
            doors_open=False,
            direction=Direction.NONE,
        )
    )

    for ev in events:
        # Контекст, который может использоваться в будущем для FSM
        context: Dict[str, object] = {
            "call_received": True,
            "floor": ev.floor,
            "direction": ev.direction.value,
            "time": ev.time,
        }

        call_time = float(ev.time)
        # лифт не может начать обслуживать вызов раньше его появления
        start_time = max(current_time, call_time)

        # куда едем
        target_floor = ev.floor
        floor_diff = abs(target_floor - current_floor)

        if target_floor > current_floor:
            direction = Direction.UP
            moving_state_id = "MOVING_UP"
        elif target_floor < current_floor:
            direction = Direction.DOWN
            moving_state_id = "MOVING_DOWN"
        else:
            direction = Direction.NONE
            moving_state_id = None

        # время в пути
        travel_time = floor_diff * move_time
        arrival_time = start_time + travel_time

        # метрика ожидания: от момента вызова до прибытия на этаж
        wait_time = arrival_time - call_time
        total_wait_time += max(wait_time, 0.0)
        total_moves += floor_diff
        stops += 1

        # Логический автомат (пока почти не влияет на физику, но можно будет
        # использовать для проверки допустимости сценария)
        if fsm_state is not None:
            tr = _choose_transition(fsm, fsm_state, context)
            if tr is not None:
                # просто обновим логическое состояние для статистики
                # (физическое состояние пока ведём отдельно)
                new_state = tr.to_state_id

                # не навязываем физике лишних состояний, только проверяем:
                if new_state in ALLOWED_STATES:
                    # физику всё равно считаем сами, так что здесь
                    # можно просто обновить id
                    fsm_state = FSMState(
                        id=new_state,
                        name=new_state,
                        is_initial=False,
                        is_final=False,
                    )

        # === ФИЗИЧЕСКАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ ПО ВЫЗОВУ ===

        # 1. Если нужно двигаться — добавляем кадр движения
        if floor_diff > 0 and moving_state_id is not None:
            # Начало движения от текущего этажа
            timeline.append(
                TimelineItem(
                    time=int(round(start_time)),
                    floor=current_floor,
                    state_id=moving_state_id,
                    doors_open=False,
                    direction=direction,
                )
            )

        # 2. Прибытие на этаж: начало дверного цикла
        # DOOR_OPENING
        t_opening = arrival_time
        timeline.append(
            TimelineItem(
                time=int(round(t_opening)),
                floor=target_floor,
                state_id="DOOR_OPENING",
                doors_open=False,
                direction=Direction.NONE,
            )
        )

        # DOOR_OPEN
        t_open = t_opening + door_opening_phase
        timeline.append(
            TimelineItem(
                time=int(round(t_open)),
                floor=target_floor,
                state_id="DOOR_OPEN",
                doors_open=True,
                direction=Direction.NONE,
            )
        )

        # DOOR_CLOSING
        t_closing = t_open + door_open_phase
        timeline.append(
            TimelineItem(
                time=int(round(t_closing)),
                floor=target_floor,
                state_id="DOOR_CLOSING",
                doors_open=False,
                direction=Direction.NONE,
            )
        )

        # IDLE_CLOSED после дверного цикла
        t_idle = t_closing + door_closing_phase
        timeline.append(
            TimelineItem(
                time=int(round(t_idle)),
                floor=target_floor,
                state_id="IDLE_CLOSED",
                doors_open=False,
                direction=Direction.NONE,
            )
        )

        # обновляем положение лифта и время
        current_floor = target_floor
        current_time = t_idle

    avg_wait_time = total_wait_time / len(events) if events else 0.0

    metrics = SimulationMetrics(
        avg_wait_time=avg_wait_time,
        total_moves=total_moves,
        stops=stops,
    )

    return SimulationResult(timeline=timeline, metrics=metrics)


# ===== Постобработка таймлайна (оставляем как безопасную обёртку) =====

def enrich_timeline_with_fsm_states(
    timeline: List[Dict[str, Any]],
    door_time: float,
) -> List[Dict[str, Any]]:
    """
    Исторически эта функция пыталась из грубых состояний "moving"/"idle"
    достроить фазы дверей и движения.

    В НОВОЙ МОДЕЛИ simulate() уже возвращает корректные состояния:
    IDLE_CLOSED / DOOR_OPENING / DOOR_OPEN / DOOR_CLOSING / MOVING_UP / MOVING_DOWN.

    Поэтому:
    - если state_id уже из ALLOWED_STATES, просто возвращаем таймлайн как есть;
    - если вдруг попадутся старые 'moving' / 'idle' — можно будет
      дописать конвертацию, но в рамках текущего проекта это не требуется.
    """

    if not timeline:
        return timeline

    # Если хотя бы один кадр уже в новом формате — считаем, что всё ОК
    if any(str(f.get("state_id")) in ALLOWED_STATES for f in timeline):
        return timeline

    # На всякий случай — мягкий fallback: просто копия без изменений
    return [deepcopy(f) for f in timeline]
