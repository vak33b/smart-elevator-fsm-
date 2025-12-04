from fastapi import APIRouter

from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.simulation import simulate

router = APIRouter()


@router.post(
    "/",
    response_model=SimulationResult,
    summary="Запустить симуляцию FSM лифта по сценарию",
)
def run_simulation(payload: SimulationRequest) -> SimulationResult:
    """
    Принимает описание FSM, конфиг лифта и сценарий вызовов.
    Пока используется упрощённая модель (заглушка),
    позднее сюда добавим полноценную симуляцию.
    """
    result = simulate(payload)
    return result
