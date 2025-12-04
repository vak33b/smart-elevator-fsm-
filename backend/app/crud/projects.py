from sqlalchemy.orm import Session
from typing import Optional, List

from app import models, schemas


# ---------- GET ONE ----------

def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
        .first()
    )


# ---------- GET LIST ----------

def get_projects(db: Session, skip: int = 0, limit: int = 100) -> List[models.Project]:
    return (
        db.query(models.Project)
        .offset(skip)
        .limit(limit)
        .all()
    )


# ---------- CREATE ----------

def create_project(db: Session, project_in: schemas.ProjectCreate) -> models.Project:
    obj = models.Project(
        name=project_in.name,
        description=project_in.description,
        config=project_in.config,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- UPDATE (НОВОЕ) ----------

def update_project(
    db: Session,
    project: models.Project,
    project_in: schemas.ProjectUpdate,
) -> models.Project:
    data = project_in.dict(exclude_unset=True)

    for field, value in data.items():
        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)
    return project
