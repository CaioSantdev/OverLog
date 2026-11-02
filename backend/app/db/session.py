from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,
    pool_size=5, max_overflow=5, pool_timeout=5, pool_recycle=1800,
    hide_parameters=True,
    connect_args={"connect_timeout": 3,
                  "options": get_settings().connection_options + " -c statement_timeout=10000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000"},
)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    with SessionLocal() as session:
        yield session
