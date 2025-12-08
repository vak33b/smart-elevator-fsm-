from fastapi import FastAPI

from app.core.config import get_settings
from app.core.config import settings
from app.api.v1.api import api_router
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["root"])
def read_root():
    return {"message": "Smart Elevator FSM backend is running"}
