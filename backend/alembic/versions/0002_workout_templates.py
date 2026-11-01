"""Create workout templates, exercises and planned sets."""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("workout_templates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "position", name="uq_workout_user_position"),
        sa.CheckConstraint("position >= 0 AND position < 6", name="ck_workout_position"))
    op.create_index("ix_workout_templates_user_id", "workout_templates", ["user_id"])
    op.create_table("template_exercises",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workout_template_id", sa.String(36), sa.ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.CheckConstraint("position >= 0", name="ck_exercise_position"))
    op.create_index("ix_template_exercises_workout_template_id", "template_exercises", ["workout_template_id"])
    op.create_table("planned_sets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("template_exercise_id", sa.String(36), sa.ForeignKey("template_exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("set_type", sa.String(20), nullable=False),
        sa.Column("target_repetitions", sa.Integer(), nullable=False),
        sa.Column("target_weight", sa.Numeric(7, 2)),
        sa.CheckConstraint("position >= 0", name="ck_set_position"),
        sa.CheckConstraint("target_repetitions > 0 AND target_repetitions <= 999", name="ck_set_repetitions"),
        sa.CheckConstraint("target_weight IS NULL OR target_weight >= 0", name="ck_set_weight"),
        sa.CheckConstraint("set_type IN ('warmup','feeder','work','backoff','failure')", name="ck_set_type"))
    op.create_index("ix_planned_sets_template_exercise_id", "planned_sets", ["template_exercise_id"])


def downgrade():
    op.drop_table("planned_sets")
    op.drop_table("template_exercises")
    op.drop_table("workout_templates")
