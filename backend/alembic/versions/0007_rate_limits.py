"""Shared, expiring API rate limit counters."""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('rate_limit_buckets',
        sa.Column('key', sa.String(64), primary_key=True),
        sa.Column('hits', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.BigInteger(), nullable=False),
        sa.CheckConstraint('hits > 0', name='ck_rate_limit_hits'))
    op.create_index('ix_rate_limit_buckets_expires_at', 'rate_limit_buckets', ['expires_at'])


def downgrade():
    op.drop_index('ix_rate_limit_buckets_expires_at', table_name='rate_limit_buckets')
    op.drop_table('rate_limit_buckets')
