from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.schemas.workout import SetType


class SetComparison(BaseModel):
    exercise_id: str
    exercise_name: str
    set_id: str
    set_position: int
    set_type: SetType
    current_weight: Decimal
    current_repetitions: int
    previous_session_id: str | None = None
    previous_weight: Decimal | None = None
    previous_repetitions: int | None = None
    outcome: Literal['weight_progress', 'repetition_progress', 'no_progress', 'no_baseline', 'not_comparable', 'ambiguous']


class ProgressionReport(BaseModel):
    policy_version: int = 1
    weight_progressions: int = 0
    repetition_progressions: int = 0
    compared_sets: int = 0
    comparisons: list[SetComparison] = []
