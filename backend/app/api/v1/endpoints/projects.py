from typing import List, Dict, Any


from fastapi import APIRouter, Depends, HTTPException, status
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
    """
    Запуск симуляции проекта по его ID.
    Используется конфиг проекта + возможность переопределения.
    """

    # 1. Загружаем проект
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

    # 2. Восстанавливаем ProjectConfig
    try:
        project_config = schemas.ProjectConfig.model_validate(project.config)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid project config format: {e}",
        )

    # 3. Выбираем конфиг лифта
    elevator_config = payload.config_override or project_config.elevator

    # 4. Выбираем сценарий
    scenario = payload.scenario or project_config.default_scenario
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No scenario provided and project has no default_scenario",
        )

    # 5. Формируем объект запроса симуляции
    sim_request = schemas.SimulationRequest(
        project_id=project_id,
        config=elevator_config,
        fsm=project_config.fsm,
        scenario=scenario,
    )

    # 6. Выполняем симуляцию
    result = simulate(sim_request)

    # 7. Определяем время дверей
    try:
        door_time = float(elevator_config.door_time)
    except AttributeError:
        door_time = float(elevator_config.get("door_time", 2.0))

    # 8. Получаем dict результата
    result_dict = result.model_dump()
    timeline = result_dict.get("timeline", [])

    # 9. Постобработка таймлайна (FSM-состояния)
    enriched = enrich_timeline_with_fsm_states(
        timeline=timeline,
        door_time=door_time,
    )
    result_dict["timeline"] = enriched

    # 10. FastAPI сам приведёт dict → SimulationResult
    return result_dict

def enrich_timeline_with_fsm_states(
    timeline: List[Dict[str, Any]],
    door_time: float,
) -> List[Dict[str, Any]]:
    """
    Постобработка таймлайна симуляции.

    На входе ожидаем кадры вида:
      {
        "time": float,
        "floor": int,
        "state_id": "moving" | "idle" | ...,
        "doors_open": bool,
        "direction": "up" | "down" | "none"
      }

    На выходе получаем более подробные состояния:
      idle_closed, moving_up, moving_down,
      doors_opening, doors_open, doors_closing
    """

    if not timeline:
        return timeline

    # 1. Нормализуем moving/idle → moving_up/down/idle_closed
    base_processed: List[Dict[str, Any]] = []
    for frame in timeline:
        f = dict(frame)  # делаем обычный dict, если был pydantic-объект

        base_state = f.get("state_id")
        direction = f.get("direction") or "none"

        if base_state == "moving":
            if direction == "up":
                f["state_id"] = "moving_up"
            elif direction == "down":
                f["state_id"] = "moving_down"
            else:
                f["state_id"] = "idle_closed"
            f["doors_open"] = False
        elif base_state == "idle":
            # вместо "idle" считаем, что лифт просто стоит с закрытыми дверями,
            # а фазы дверей добавим отдельно
            f["state_id"] = "idle_closed"
            f["doors_open"] = False
        else:
            # неизвестное состояние — оставляем как есть
            pass

        base_processed.append(f)

    # 2. Вставляем фазы дверей между кадрами,
    #    где лифт стоит на одном этаже с direction="none"
    enriched: List[Dict[str, Any]] = []
    n = len(base_processed)

    door_opening_phase = door_time * 0.25
    door_open_phase = door_time * 0.5
    door_closing_phase = door_time * 0.25

    i = 0
    while i < n:
        f = base_processed[i]
        enriched.append(f)

        if i + 1 < n:
            next_f = base_processed[i + 1]
            curr_floor = f.get("floor")
            next_floor = next_f.get("floor")
            curr_dir = f.get("direction") or "none"
            dt = float(next_f.get("time", 0) - f.get("time", 0))

            if (
                curr_floor == next_floor
                and curr_dir == "none"
                and dt >= door_time
            ):
                t0 = float(f["time"])
                t1 = t0 + door_opening_phase
                t2 = t1 + door_open_phase
                t3 = t2 + door_closing_phase

                # doors_opening
                enriched.append(
                    {
                        **f,
                        "time": t1,
                        "state_id": "doors_opening",
                        "doors_open": False,
                    }
                )
                # doors_open
                enriched.append(
                    {
                        **f,
                        "time": t2,
                        "state_id": "doors_open",
                        "doors_open": True,
                    }
                )
                # doors_closing
                enriched.append(
                    {
                        **f,
                        "time": t3,
                        "state_id": "doors_closing",
                        "doors_open": False,
                    }
                )

        i += 1

    enriched.sort(key=lambda x: x.get("time", 0))
    return enriched

