from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_expire_minutes: int = Field(default=60, ge=1, le=1440)
    cookie_secure: bool = False
    production: bool = False
    rate_limit_auth: int = Field(default=30, ge=1, le=1000)
    rate_limit_register: int = Field(default=10, ge=1, le=1000)
    rate_limit_login_account: int = Field(default=10, ge=1, le=1000)
    rate_limit_ip: int = Field(default=600, ge=1, le=10000)
    rate_limit_read: int = Field(default=300, ge=1, le=10000)
    rate_limit_write: int = Field(default=120, ge=1, le=10000)

    postgres_host: str = "localhost"
    postgres_port: int = Field(default=5432, ge=1, le=65535)
    postgres_schema: str = Field(default="public", pattern=r"^[a-z_][a-z0-9_]{0,62}$")
    postgres_sslmode: Literal['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'] = 'prefer'
    postgres_sslrootcert: str | None = None
    postgres_db: str = "overlog"
    postgres_user: str = "overlog"
    postgres_password: str = "local-development-only"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @model_validator(mode="after")
    def secure_production(self):
        if self.production:
            if not self.cookie_secure:
                raise ValueError("Produção exige COOKIE_SECURE=true.")
            if len(self.postgres_password) < 16 or self.postgres_password == 'local-development-only':
                raise ValueError("Produção exige uma senha de banco exclusiva com ao menos 16 caracteres.")
            if not self.cors_origins or any(not origin.startswith('https://') or origin.endswith('/') or '*' in origin for origin in self.cors_origins):
                raise ValueError("Produção exige origens HTTPS explícitas, sem barra final.")
        return self

    @property
    def connection_options(self) -> str:
        return f"-c search_path={self.postgres_schema}"

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
            query={"sslmode": self.postgres_sslmode, "options": self.connection_options,
                   **({"sslrootcert": self.postgres_sslrootcert} if self.postgres_sslrootcert else {})},
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
