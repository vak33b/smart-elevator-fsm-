from __future__ import annotations

from typing import List, Dict

from app.schemas.simulation import (
    SimulationRequest,
    SimulationResult,
    TimelineItem,
    SimulationMetrics,
)
from app.schemas.scenario import Direction
from app.schemas.fsm import FSMDefinition, FSMState, FSMTransition
from copy import deepcopy

def _get_initial_state(fsm: FSMDefinition) -> FSMState:
    # Ищем состояние, помеченное как is_initial
    for st in fsm.states:
        if st.is_initial:
            return st
    # fallback: первое состояние (по идее до сюда не дойдём из-за валидации)
    return fsm.states[0]


def _build_state_map(fsm: FSMDefinition) -> Dict[str, FSMState]:
    return {st.id: st for st in fsm.states}


def _is_condition_satisfied(condition: str, context: Dict[str, object]) -> bool:
    """
    Простейшая модель условий:
    - '', '*', 'always'  -> всегда True
    - если condition совпадает с именем сигнала в context:
        -> True, если context[condition] приводится к True
    - иначе -> False
    """
    cond = (condition or "").strip().lower()

    if cond in ("", "*", "always"):
        return True

    # простейший случай: условие == имя булевого сигнала
    if cond in context:
        return bool(context[cond])

    # TODO: сюда можно позже прикрутить более сложный DSL (floor == 3 и т.п.)
    return False


def _choose_transition(
    fsm: FSMDefinition,
    current_state: FSMState,
    context: Dict[str, object],
) -> FSMTransition | None:
    """
    Выбираем первый переход из текущего состояния, у которого условие истинно
    в заданном контексте.
    """
    for tr in fsm.transitions:
        if tr.from_state_id != current_state.id:
            continue
        if _is_condition_satisfied(tr.condition, context):
            return tr
    return None


def simulate(request: SimulationRequest) -> SimulationResult:
    """
    Простейшая, но уже связанная с FSM симуляция:
    - есть текущее состояние FSM
    - при каждом событии строится контекст входных сигналов
    - по контексту выбирается переход (или остаёмся в текущем состоянии)
    - лифт перемещается между этажами с move_time на этаж
    - время ожидания = время прибытия лифта - время вызова
    """

    events = sorted(request.scenario.events, key=lambda e: e.time)
    fsm = request.fsm
    config = request.config

    if not events:
        # пустой сценарий
        return SimulationResult(
            timeline=[],
            metrics=SimulationMetrics(
                avg_wait_time=0.0,
                total_moves=0,
                stops=0,
            ),
        )

    # FSM
    current_state = _get_initial_state(fsm)
    state_map = _build_state_map(fsm)

    # Лифт
    current_floor = 0
    current_time: float = 0.0

    total_moves = 0
    total_wait_time = 0.0

    timeline: List[TimelineItem] = []

    for ev in events:
        # контекст входных сигналов для условий переходов
        context: Dict[str, object] = {
            "call_received": True,  # базовый сигнал "получен вызов"
            "floor": ev.floor,
            "direction": ev.direction.value,
            "time": ev.time,
        }

        # лифт не может приехать раньше, чем узнал о вызове
        start_time = max(current_time, float(ev.time))

        # считаем, сколько ехать
        floor_diff = abs(ev.floor - current_floor)
        travel_time = floor_diff * config.move_time

        arrival_time = start_time + travel_time
        wait_time = arrival_time - float(ev.time)
        total_wait_time += wait_time
        total_moves += floor_diff

        # направление движения
        if ev.floor > current_floor:
            direction = Direction.UP
        elif ev.floor < current_floor:
            direction = Direction.DOWN
        else:
            direction = Direction.NONE

        # выбираем переход FSM
        transition = _choose_transition(fsm, current_state, context)
        if transition is not None:
            next_state = state_map[transition.to_state_id]
        else:
            next_state = current_state

        current_state = next_state

        # фиксируем прибытие на этаж
        timeline.append(
            TimelineItem(
                time=int(round(arrival_time)),
                floor=ev.floor,
                state_id=current_state.id,
                doors_open=True,
                direction=direction,
            )
        )

        # обновляем положение лифта
        current_floor = ev.floor
        # учтём время открытия/закрытия дверей
        current_time = arrival_time + config.door_time

    avg_wait_time = total_wait_time / len(events) if events else 0.0


    metrics = SimulationMetrics(
        avg_wait_time=avg_wait_time,
        total_moves=total_moves,
        stops=len(events),
    )

    return SimulationResult(timeline=timeline, metrics=metrics)

def enrich_timeline_with_fsm_states(
    timeline: List[Dict],
    door_time: float,
) -> List[Dict]:
    """
    Постобработка таймлайна:
    - заменяем грубые state_id ("moving"/"idle") на подробные:
      idle_closed, doors_opening, doors_open, doors_closing, moving_up, moving_down
    - делаем простую модель дверей вокруг остановок.
    """

    if not timeline:
        return timeline

    result: List[Dict] = []
    door_open_phase = door_time * 0.5
    door_opening_phase = door_time * 0.25
    door_closing_phase = door_time * 0.25

    for i, frame in enumerate(timeline):
        f = deepcopy(frame)

        base_state = f.get("state_id")
        direction = f.get("direction", "none")
        doors_open = bool(f.get("doors_open"))

        # По умолчанию doors_open будем поддерживать логически
        # и state_id будем заменять на более подробный
        if base_state == "moving":
            if direction == "up":
                f["state_id"] = "moving_up"
            elif direction == "down":
                f["state_id"] = "moving_down"
            else:
                # На всякий случай fallback
                f["state_id"] = "idle_closed"
        elif base_state == "idle":
            # idle мы будем раскладывать в несколько фаз дверей,
            # смотря по тому, как долго лифт стоит на этаже.
            # Здесь сами моменты фаз будем рассчитывать чуть ниже.
            # Пока просто оставим как idle_closed — потом
            # возможно заменим на doors_opening / doors_open / doors_closing.
            f["state_id"] = "idle_closed"

        # Проставляем doors_open = False по умолчанию и скорректируем дальше
        if f["state_id"] in ("moving_up", "moving_down", "idle_closed"):
            f["doors_open"] = False
        result.append(f)

    # Теперь пытаемся разбить "стоянки" на фазы дверей
    # Ищем последовательности кадров на одном этаже с direction="none"
    enriched: List[Dict] = []
    i = 0
    n = len(result)
    while i < n:
        f = result[i]
        enriched.append(f)
        # Если это "стоянка" (нет движения между этим и следующим кадром)
        if i + 1 < n:
            curr_floor = f["floor"]
            next_floor = result[i + 1]["floor"]
            dt = result[i + 1]["time"] - f["time"]
            if curr_floor == next_floor and dt >= door_time and result[i]["direction"] == "none":
                # Попробуем вставить 3 фазы дверей между этими кадрами
                t0 = f["time"]
                t1 = t0 + door_opening_phase
                t2 = t1 + door_open_phase
                t3 = t2 + door_closing_phase

                # doors_opening
                enriched.append({
                    **f,
                    "time": t1,
                    "state_id": "doors_opening",
                    "doors_open": False,
                })
                # doors_open
                enriched.append({
                    **f,
                    "time": t2,
                    "state_id": "doors_open",
                    "doors_open": True,
                })
                # doors_closing
                enriched.append({
                    **f,
                    "time": t3,
                    "state_id": "doors_closing",
                    "doors_open": False,
                })
        i += 1

    # Отсортируем по времени и вернём
    enriched.sort(key=lambda x: x["time"])
    return enriched