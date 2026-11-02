from sqlalchemy import BigInteger, CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RateLimitBucket(Base):
    __tablename__ = 'rate_limit_buckets'
    __table_args__ = (CheckConstraint('hits > 0', name='ck_rate_limit_hits'),)
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    hits: Mapped[int]
    expires_at: Mapped[int] = mapped_column(BigInteger, index=True)
