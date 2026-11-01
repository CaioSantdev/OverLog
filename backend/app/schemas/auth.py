from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Login(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class Register(Login):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    created_at: datetime
