from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.workout import SetType


class SessionStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workout_template_id: str


class SetInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    set_type: SetType
    repetitions: int = Field(ge=0, le=999, strict=True)
    weight: Decimal | None = Field(default=None, ge=0, le=Decimal("99999.99"), max_digits=7, decimal_places=2, allow_inf_nan=False)
    is_completed: bool = Field(strict=True)

    @model_validator(mode="after")
    def completed_weight(self):
        if self.is_completed and self.weight is None:
            raise ValueError("Informe a carga antes de concluir a série (zero para peso corporal).")
        return self


class SessionExerciseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    sets: list[SetInput] = Field(max_length=60)


class SessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0, strict=True)
    mutation_id: UUID
    exercises: list[SessionExerciseInput] = Field(max_length=100)


class SessionAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0, strict=True)


class SetPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    position: int
    set_type: SetType
    weight: Decimal | None
    repetitions: int
    is_completed: bool


class SessionExercisePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name_snapshot: str
    position: int
    sets: list[SetPublic]


class SessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workout_template_id: str | None
    name_snapshot: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    duration_seconds: int | None
    completed_sets: int
    revision: int
    weight_progressions: int | None = None
    repetition_progressions: int | None = None


class SessionPublic(SessionSummary):
    last_mutation_id: str | None
    exercises: list[SessionExercisePublic]
