"""Persist session snapshots and performed sets."""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("workout_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workout_template_id", sa.String(36), sa.ForeignKey("workout_templates.id", ondelete="SET NULL")),
        sa.Column("name_snapshot", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_mutation_id", sa.String(36)),
        sa.CheckConstraint("status IN ('in_progress','completed','discarded')", name="ck_session_status"),
        sa.CheckConstraint("revision >= 0", name="ck_session_revision"),
        sa.CheckConstraint("(status = 'in_progress' AND finished_at IS NULL) OR (status != 'in_progress' AND finished_at IS NOT NULL)", name="ck_session_finished"),
        sa.CheckConstraint("finished_at IS NULL OR finished_at >= started_at", name="ck_session_times"))
    op.create_index("ix_workout_sessions_user_id", "workout_sessions", ["user_id"])
    op.create_index("uq_session_active_user", "workout_sessions", ["user_id"], unique=True,
        postgresql_where=sa.text("status = 'in_progress'"), sqlite_where=sa.text("status = 'in_progress'"))
    op.create_table("session_exercises",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workout_session_id", sa.String(36), sa.ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name_snapshot", sa.String(100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("position >= 0", name="ck_session_exercise_position"))
    op.create_index("ix_session_exercises_workout_session_id", "session_exercises", ["workout_session_id"])
    op.create_table("performed_sets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_exercise_id", sa.String(36), sa.ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("set_type", sa.String(20), nullable=False),
        sa.Column("weight", sa.Numeric(7, 2)),
        sa.Column("repetitions", sa.Integer(), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.CheckConstraint("position >= 0", name="ck_performed_position"),
        sa.CheckConstraint("repetitions >= 0 AND repetitions <= 999", name="ck_performed_repetitions"),
        sa.CheckConstraint("weight IS NULL OR weight >= 0", name="ck_performed_weight"),
        sa.CheckConstraint("NOT is_completed OR weight IS NOT NULL", name="ck_performed_completed"),
        sa.CheckConstraint("set_type IN ('warmup','feeder','work','backoff','failure')", name="ck_performed_type"))
    op.create_index("ix_performed_sets_session_exercise_id", "performed_sets", ["session_exercise_id"])


def downgrade():
    op.drop_table("performed_sets")
    op.drop_table("session_exercises")
    op.drop_table("workout_sessions")
