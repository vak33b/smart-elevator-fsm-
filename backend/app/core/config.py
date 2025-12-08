from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Elevator FSM"
    API_V1_PREFIX: str = "/api/v1"

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "smart_elevator"
    SECRET_KEY: str = "super-secret-key-change-me"

    # сколько минут живёт access-token
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Можно переопределить целиком через .env
    DATABASE_URL: str | None = None

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL

        return (
            f"postgresql+psycopg2://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()