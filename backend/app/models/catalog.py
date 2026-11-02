from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CatalogExercise(Base):
    __tablename__ = "exercise_catalog"
    __table_args__ = (Index("ix_catalog_group_equipment", "muscle_group", "equipment"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    muscle_group: Mapped[str] = mapped_column(String(50))
    equipment: Mapped[str] = mapped_column(String(50))
    search_text: Mapped[str] = mapped_column(String(250))
