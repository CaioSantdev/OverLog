import unicodedata

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, Database
from app.models.catalog import CatalogExercise
from app.schemas.catalog import CatalogFilters, CatalogPage

router = APIRouter(prefix='/exercise-catalog', tags=['Catálogo de exercícios'])


def normalize_search(value: str) -> str:
    return ' '.join(''.join(char for char in unicodedata.normalize('NFKD', value.casefold())
        if not unicodedata.combining(char)).split())


@router.get('/filters', response_model=CatalogFilters)
def filters(user: CurrentUser, db: Database):
    return CatalogFilters(
        muscle_groups=list(db.scalars(select(CatalogExercise.muscle_group).distinct().order_by(CatalogExercise.muscle_group))),
        equipment=list(db.scalars(select(CatalogExercise.equipment).distinct().order_by(CatalogExercise.equipment))),
    )


@router.get('', response_model=CatalogPage)
def list_catalog(user: CurrentUser, db: Database, q: str = Query('', max_length=100),
                 muscle_group: str | None = Query(None, max_length=50),
                 equipment: str | None = Query(None, max_length=50),
                 offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50)):
    conditions = []
    for term in normalize_search(q).split():
        conditions.append(CatalogExercise.search_text.contains(term, autoescape=True))
    if muscle_group:
        conditions.append(CatalogExercise.muscle_group == muscle_group)
    if equipment:
        conditions.append(CatalogExercise.equipment == equipment)
    total = db.scalar(select(func.count()).select_from(CatalogExercise).where(*conditions))
    items = db.scalars(select(CatalogExercise).where(*conditions).order_by(
        CatalogExercise.name, CatalogExercise.id).offset(offset).limit(limit)).all()
    return CatalogPage(items=items, total=total, offset=offset, limit=limit)
