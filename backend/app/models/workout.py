import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def identifier():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"
    __table_args__ = (
        UniqueConstraint("user_id", "position", name="uq_workout_user_position"),
        CheckConstraint("position >= 0 AND position < 6", name="ck_workout_position"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    exercises: Mapped[list["TemplateExercise"]] = relationship(
        cascade="all, delete-orphan", order_by="TemplateExercise.position", back_populates="workout",
    )


class TemplateExercise(Base):
    __tablename__ = "template_exercises"
    __table_args__ = (CheckConstraint("position >= 0", name="ck_exercise_position"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    catalog_exercise_id: Mapped[str | None] = mapped_column(ForeignKey("exercise_catalog.id", name="fk_template_exercise_catalog", ondelete="SET NULL"), nullable=True, index=True)
    workout_template_id: Mapped[str] = mapped_column(ForeignKey("workout_templates.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[int]
    workout: Mapped[WorkoutTemplate] = relationship(back_populates="exercises")
    sets: Mapped[list["PlannedSet"]] = relationship(
        cascade="all, delete-orphan", order_by="PlannedSet.position", back_populates="exercise",
    )


class PlannedSet(Base):
    __tablename__ = "planned_sets"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_set_position"),
        CheckConstraint("target_repetitions > 0 AND target_repetitions <= 999", name="ck_set_repetitions"),
        CheckConstraint("target_weight IS NULL OR target_weight >= 0", name="ck_set_weight"),
        CheckConstraint("set_type IN ('warmup','feeder','work','backoff','failure')", name="ck_set_type"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=identifier)
    template_exercise_id: Mapped[str] = mapped_column(ForeignKey("template_exercises.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    set_type: Mapped[str] = mapped_column(String(20))
    target_repetitions: Mapped[int]
    target_weight: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    exercise: Mapped[TemplateExercise] = relationship(back_populates="sets")
