"""Persist progression results on session completion."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('workout_sessions', sa.Column('progression_snapshot', sa.JSON(), nullable=True))
    op.create_index('ix_session_user_status_finished', 'workout_sessions', ['user_id', 'status', 'finished_at'])


def downgrade():
    op.drop_index('ix_session_user_status_finished', table_name='workout_sessions')
    op.drop_column('workout_sessions', 'progression_snapshot')
