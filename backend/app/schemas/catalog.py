from pydantic import BaseModel, ConfigDict


class CatalogExercisePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    muscle_group: str
    equipment: str


class CatalogPage(BaseModel):
    items: list[CatalogExercisePublic]
    total: int
    offset: int
    limit: int


class CatalogFilters(BaseModel):
    muscle_groups: list[str]
    equipment: list[str]
