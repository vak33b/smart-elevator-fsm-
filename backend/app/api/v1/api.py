from fastapi import APIRouter

from app.api.v1.endpoints import health, projects, simulation, fsm

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(
    simulation.router, prefix="/simulation", tags=["simulation"]
)
api_router.include_router(fsm.router, prefix="/fsm", tags=["fsm"])
