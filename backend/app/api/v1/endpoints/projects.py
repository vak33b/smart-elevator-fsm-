from typing import List, Dict, Any


from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.db.session import get_db
from app import models, schemas
from app.services.simulation import simulate
from app.crud import projects as crud_projects

router = APIRouter()


@router.post(
    "/",
    response_model=schemas.Project,
    status_code=status.HTTP_201_CREATED,
    summary="Создать новый проект",
)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
):
    # config: ProjectConfig -> dict (или None)
    config_data = (
        project_in.config.model_dump()
        if project_in.config is not None
        else None
    )

    project = models.Project(
        name=project_in.name,
        description=project_in.description,
        config=config_data,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project



@router.get(
    "/",
    response_model=List[schemas.Project],
    summary="Получить список проектов",
)
def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    projects = (
        db.query(models.Project)
        .order_by(models.Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return projects


@router.get(
    "/{project_id}",
    response_model=schemas.Project,
    summary="Получить проект по ID",
)
def read_project(
    project_id: int,
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.put(
    "/{project_id}",
    response_model=schemas.Project,
    summary="Обновить проект (в том числе FSM)",
)
def update_project(
    project_id: int,
    project_in: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
):
    project = crud_projects.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    project = crud_projects.update_project(
        db=db,
        project=project,
        project_in=project_in,
    )
    return project




@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить проект",
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    db.delete(project)
    db.commit()
    return None

def enrich_timeline_with_fsm_states(
    timeline: List[Dict[str, Any]],
    door_time: float = 4.0,
) -> List[Dict[str, Any]]:
    """
    Нормализуем state_id (moving_up / moving_down / idle_closed)
    и добавляем фазы остановки с открытыми дверями на каждом этаже
    на door_time секунд.
    """
    new_timeline: List[Dict[str, Any]] = []

    for idx, frame in enumerate(timeline):
        base = dict(frame)  # копия кадра
        base_state = base.get("state_id") or "idle"
        direction = base.get("direction") or "none"

        # Нормализуем имя состояния, но НЕ трогаем doors_open, кроме движения
        if base_state == "moving":
            if direction == "up":
                base["state_id"] = "moving_up"
            elif direction == "down":
                base["state_id"] = "moving_down"
            else:
                base["state_id"] = "idle_closed"
            # в движении двери всегда закрыты
            base["doors_open"] = False
        elif base_state == "idle":
            base["state_id"] = "idle_closed"

        new_timeline.append(base)

        # Для всех кадров, кроме самого первого (старт в 0),
        # добавляем фазу с открытыми дверями на этаже
        if idx > 0:
            # начало открытия дверей — почти в момент прибытия
            open_frame = dict(base)
            open_frame["time"] = base["time"] + 0.001  # маленький сдвиг, чтобы не было дублей по времени
            open_frame["state_id"] = "doors_open"
            open_frame["doors_open"] = True

            # закрытие дверей / конец остановки через door_time секунд
            close_frame = dict(base)
            close_frame["time"] = base["time"] + door_time
            close_frame["state_id"] = "idle_closed"
            close_frame["doors_open"] = False

            new_timeline.append(open_frame)
            new_timeline.append(close_frame)

    # сортируем по времени, чтобы всё шло по возрастанию
    new_timeline.sort(key=lambda f: f["time"])
    return new_timeline

@router.post(
    "/{project_id}/simulate",
    response_model=schemas.SimulationResult,
    summary="Запустить симуляцию для сохранённого проекта",
)



def simulate_project(
    project_id: int,
    payload: schemas.ProjectSimulationRequest,
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if project.config is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no config",
        )

    try:
        project_config = schemas.ProjectConfig.model_validate(project.config)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid project config format: {e}",
        )

    # лифт
    elevator_config = payload.config_override or project_config.elevator

    # сценарий
    scenario = payload.scenario or project_config.default_scenario
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No scenario provided and project has no default_scenario",
        )

    sim_request = schemas.SimulationRequest(
        project_id=project_id,
        config=elevator_config,
        fsm=project_config.fsm,
        scenario=scenario,  # это уже app.schemas.scenario.Scenario
    )

    result = simulate(sim_request)
    return result




