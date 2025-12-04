from __future__ import annotations

from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field

from .project_config import ProjectConfig


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    config: Optional[ProjectConfig] = None


class ProjectCreate(ProjectBase):
    # всё то же, что в ProjectBase
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

        


class ProjectInDBBase(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Project(ProjectInDBBase):
    pass