from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_expire_minutes: int = Field(default=60, ge=1, le=1440)
    cookie_secure: bool = False

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "overlog"
    postgres_user: str = "overlog"
    postgres_password: str = "local-development-only"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
