from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, JSON, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.workout import identifier, now


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (
        CheckConstraint("status IN ('in_progress','completed','discarded')", name="ck_session_status"),
        CheckConstraint("revision >= 0", name="ck_session_revision"),
        CheckConstraint("(status = 'in_progress' AND finished_at IS NULL) OR (status != 'in_progress' AND finished_at IS NOT NULL)", name="ck_session_finished"),
        CheckConstraint("finished_at IS NULL OR finished_at >= started_at", name="ck_session_times"),
        Index("ix_session_user_status_finished", "user_id", "status", "finished_at"),
        Index("uq_session_active_user", "user_id", unique=True,
              postgresql_where=text("status = 'in_progress'"), sqlite_where=text("status = 'in_progress'")),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    workout_template_id: Mapped[str | None] = mapped_column(ForeignKey("workout_templates.id", ondelete="SET NULL"), nullable=True)
    name_snapshot: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revision: Mapped[int] = mapped_column(default=0, server_default="0")
    progression_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_mutation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    exercises: Mapped[list["SessionExercise"]] = relationship(cascade="all, delete-orphan", order_by="SessionExercise.position", back_populates="session")

    @property
    def weight_progressions(self) -> int | None:
        return self.progression_snapshot.get('weight_progressions', 0) if self.progression_snapshot else None

    @property
    def repetition_progressions(self) -> int | None:
        return self.progression_snapshot.get('repetition_progressions', 0) if self.progression_snapshot else None

    @property
    def duration_seconds(self) -> int | None:
        if self.finished_at is None:
            return None
        start = self.started_at if self.started_at.tzinfo else self.started_at.replace(tzinfo=timezone.utc)
        finish = self.finished_at if self.finished_at.tzinfo else self.finished_at.replace(tzinfo=timezone.utc)
        return max(0, int((finish - start).total_seconds()))

    @property
    def completed_sets(self) -> int:
        return sum(item.is_completed for exercise in self.exercises for item in exercise.sets)


class SessionExercise(Base):
    __tablename__ = "session_exercises"
    __table_args__ = (CheckConstraint("position >= 0", name="ck_session_exercise_position"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    workout_session_id: Mapped[str] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"), index=True)
    name_snapshot: Mapped[str] = mapped_column(String(100))
    position: Mapped[int]
    session: Mapped[WorkoutSession] = relationship(back_populates="exercises")
    sets: Mapped[list["PerformedSet"]] = relationship(cascade="all, delete-orphan", order_by="PerformedSet.position", back_populates="exercise")


class PerformedSet(Base):
    __tablename__ = "performed_sets"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_performed_position"),
        CheckConstraint("repetitions >= 0 AND repetitions <= 999", name="ck_performed_repetitions"),
        CheckConstraint("weight IS NULL OR weight >= 0", name="ck_performed_weight"),
        CheckConstraint("NOT is_completed OR weight IS NOT NULL", name="ck_performed_completed"),
        CheckConstraint("set_type IN ('warmup','feeder','work','backoff','failure')", name="ck_performed_type"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    session_exercise_id: Mapped[str] = mapped_column(ForeignKey("session_exercises.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    set_type: Mapped[str] = mapped_column(String(20))
    weight: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    repetitions: Mapped[int]
    is_completed: Mapped[bool] = mapped_column(default=False, server_default="false")
    exercise: Mapped[SessionExercise] = relationship(back_populates="sets")
