# backend/app/api/v1/api.py
from fastapi import APIRouter

from app.api.v1.endpoints import health, projects, simulation, fsm, auth, users

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["simulation"])
api_router.include_router(fsm.router, prefix="/fsm", tags=["fsm"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])