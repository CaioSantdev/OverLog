from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
SetType = Literal["warmup", "feeder", "work", "backoff", "failure"]


class PlannedSetInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str | None = None
    set_type: SetType = "work"
    target_repetitions: int = Field(ge=1, le=999, strict=True)
    target_weight: Decimal | None = Field(default=None, ge=0, le=Decimal("99999.99"), max_digits=7, decimal_places=2, allow_inf_nan=False)


class ExerciseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str | None = None
    catalog_exercise_id: Annotated[str, StringConstraints(min_length=1, max_length=80)] | None = None
    name: Name | None = None
    sets: list[PlannedSetInput] = Field(default_factory=list, max_length=30)


    @model_validator(mode="after")
    def require_manual_name(self):
        if self.catalog_exercise_id is None and self.name is None:
            raise ValueError("Informe o nome ou escolha um exercício do catálogo.")
        return self


class WorkoutInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Name
    exercises: list[ExerciseInput] = Field(default_factory=list, max_length=100)


class PlannedSetPublic(PlannedSetInput):
    model_config = ConfigDict(from_attributes=True)
    id: str
    position: int


class ExercisePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    catalog_exercise_id: str | None = None
    name: str
    position: int
    sets: list[PlannedSetPublic]


class WorkoutPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    position: int
    created_at: datetime
    updated_at: datetime
    exercises: list[ExercisePublic]
