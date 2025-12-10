# app/api/v1/endpoints/projects.py
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.db.session import get_db
from app.core.deps import get_current_user, get_current_teacher
from app.services.simulation import simulate, SimulationValidationError
from app.services.fsm_validation import validate_fsm_for_export, FSMValidationError
from app.services.fsm_verilog import generate_verilog_from_fsm

router = APIRouter()


# ---------- CRUD проектов ----------


@router.get("/", response_model=List[schemas.Project])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    student_id: Optional[int] = None,
    own_only: bool = False,  # <--- НОВЫЙ параметр
):
    """
    Студент: видит только свои проекты.
    Преподаватель/админ:
      - если own_only=true -> только свои проекты (owner_id = current_user.id);
      - если передан student_id -> проекты выбранного студента;
      - иначе -> все проекты.
    """
    q = db.query(models.Project)

    if current_user.role == models.UserRole.student:
        # студент всегда видит только свои проекты
        q = q.filter(models.Project.owner_id == current_user.id)
    else:
        # teacher / admin
        if own_only:
            q = q.filter(models.Project.owner_id == current_user.id)
        elif student_id is not None:
            q = q.filter(models.Project.owner_id == student_id)
        # иначе без фильтра — все проекты

    projects = q.order_by(models.Project.id).all()
    return projects




@router.get("/my", response_model=List[schemas.Project], summary="Мои проекты")
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Возвращает проекты текущего пользователя (студент/преподаватель/админ).
    """
    projects = (
        db.query(models.Project)
        .filter(models.Project.owner_id == current_user.id)
        .order_by(models.Project.id)
        .all()
    )
    return projects


@router.post(
    "/",
    response_model=schemas.Project,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Студент: создаёт проект только для себя (owner_id = current_user.id).
    Преподаватель: может указать owner_id студента, если создаёт для него.
    Если owner_id не указан – проект считается его собственным.
    """
    owner_id: int

    if current_user.role == models.UserRole.student:
        owner_id = current_user.id
    else:
        # teacher/admin
        if project_in.owner_id is not None:
            owner_id = project_in.owner_id
        else:
            owner_id = current_user.id

    db_project = models.Project(
        name=project_in.name,
        description=project_in.description,
        status=project_in.status,
        config=project_in.config.model_dump() if hasattr(project_in.config, "model_dump") else project_in.config,
        owner_id=owner_id,
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.post(
    "/import",
    response_model=schemas.Project,
    status_code=status.HTTP_201_CREATED,
    summary="Импортировать проект из JSON",
)
def import_project(
    project_in: schemas.ProjectImport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Создать новый проект из экспортированного JSON.
    Правила владения такие же, как при обычном создании.
    """
    owner_id: int

    if current_user.role == models.UserRole.student:
        owner_id = current_user.id
    else:
        owner_id = project_in.owner_id if project_in.owner_id is not None else current_user.id

    db_project = models.Project(
        name=project_in.name,
        description=project_in.description,
        status=project_in.status,
        config=project_in.config.model_dump() if hasattr(project_in.config, "model_dump") else project_in.config,
        owner_id=owner_id,
    )

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    # студент может видеть только свои проекты
    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому проекту",
        )

    return project


@router.get(
    "/{project_id}/export",
    response_model=schemas.ProjectExport,
    summary="Выгрузить проект в JSON",
)
def export_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Отдает минимальный JSON проекта (name, description, config) для сохранения в файл.
    Доступ: владелец (student) или преподаватель/admin.
    """
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к проекту",
        )

    return schemas.ProjectExport(
        name=project.name,
        description=project.description,
        status=project.status,
        config=project.config,
    )


@router.post(
    "/{project_id}/fsm/export",
    response_model=schemas.FSMVerilogExport,
    summary="Экспорт FSM проекта в Verilog",
)
def export_fsm_verilog(
    project_id: int,
    payload: schemas.FSMVerilogExportRequest | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    if current_user.role == models.UserRole.student and project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к проекту",
        )

    if project.config is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У проекта нет config",
        )

    project_config = schemas.ProjectConfig.model_validate(project.config)
    fsm = project_config.fsm

    try:
        validate_fsm_for_export(fsm)
    except FSMValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.errors,
        )

    module_name = payload.module_name if payload and payload.module_name else f"project_{project_id}_fsm"
    verilog = generate_verilog_from_fsm(fsm, module_name)

    return schemas.FSMVerilogExport(
        project_id=project_id,
        module_name=module_name,
        verilog=verilog,
    )


@router.put("/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: int,
    project_in: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    # студент может редактировать только свои проекты
    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому проекту",
        )

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.config is not None:
        project.config = project_in.config
    if project_in.status is not None:
        project.status = project_in.status
    if (
        current_user.role != models.UserRole.student
        and project_in.owner_id is not None
    ):
        project.owner_id = project_in.owner_id

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    # студент может удалить только свой проект
    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому проекту",
        )

    db.delete(project)
    db.commit()
    return


# ---------- Симуляция ----------


@router.post(
    "/{project_id}/simulate",
    response_model=schemas.SimulationResult,
    summary="Запустить симуляцию для сохранённого проекта",
)
def simulate_project(
    project_id: int,
    payload: schemas.ProjectSimulationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Берём Project по ID, достаём из config:
    - elevator
    - fsm
    - default_scenario
    и запускаем симуляцию.
    Можно переопределить:
    - сценарий (payload.scenario)
    - конфиг лифта (payload.config_override)
    """

    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # студент может симулировать только свои проекты
    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому проекту",
        )

    if project.config is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no config",
        )

    # Восстанавливаем ProjectConfig из JSON в БД
    try:
        project_config = schemas.ProjectConfig.model_validate(project.config)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid project config format: {e}",
        )

    # Выбираем конфиг лифта
    elevator_config = payload.config_override or project_config.elevator

    # Выбираем сценарий: либо переданный, либо default_scenario из проекта
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
        scenario=scenario,
    )

    try:
        result = simulate(sim_request)
        return result
    except SimulationValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": exc.message,
                "errors": exc.errors,
            },
        )


# ---------- РЕЦЕНЗИИ (только преподаватель) ----------


@router.post(
    "/{project_id}/reviews",
    response_model=schemas.ProjectReview,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    project_id: int,
    review_in: schemas.ProjectReviewCreate,
    db: Session = Depends(get_db),
    current_teacher: models.User = Depends(get_current_teacher),
):
    """
    Преподаватель оставляет рецензию к проекту студента.
    """
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    db_review = models.ProjectReview(
        project_id=project_id,
        teacher_id=current_teacher.id,
        comment=review_in.comment,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    db_review.teacher = current_teacher
    return db_review


@router.get(
    "/{project_id}/reviews",
    response_model=List[schemas.ProjectReview],
)
def list_reviews(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Просмотр рецензий:
    - студент может видеть рецензии своих проектов;
    - преподаватель может видеть рецензии любых проектов.
    """
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Проект не найден",
        )

    if (
        current_user.role == models.UserRole.student
        and project.owner_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому проекту",
        )

    reviews = (
        db.query(models.ProjectReview)
        .filter(models.ProjectReview.project_id == project_id)
        .order_by(models.ProjectReview.created_at)
        .all()
    )
    return reviews
