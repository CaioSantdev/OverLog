from fastapi import APIRouter, Depends, Response

from app.api.dependencies import CurrentUser, Database, require_same_origin_header
from app.schemas.workout import WorkoutInput, WorkoutPublic
from app.services.workout import apply_plan, create_workout, get_workout, query_workouts

router = APIRouter(prefix="/workouts", tags=["Treinos"])
write_dependencies = [Depends(require_same_origin_header)]


@router.get("", response_model=list[WorkoutPublic])
def list_workouts(user: CurrentUser, db: Database):
    return db.scalars(query_workouts(user.id).order_by("position")).all()


@router.post("", response_model=WorkoutPublic, status_code=201, dependencies=write_dependencies)
def create(data: WorkoutInput, user: CurrentUser, db: Database):
    return create_workout(db, user, data)


@router.get("/{workout_id}", response_model=WorkoutPublic)
def detail(workout_id: str, user: CurrentUser, db: Database):
    return get_workout(db, user.id, workout_id)


@router.put("/{workout_id}", response_model=WorkoutPublic, dependencies=write_dependencies)
def update(workout_id: str, data: WorkoutInput, user: CurrentUser, db: Database):
    workout = get_workout(db, user.id, workout_id, lock=True)
    apply_plan(workout, data, db)
    db.commit()
    db.expire_all()
    return get_workout(db, user.id, workout_id)


@router.delete("/{workout_id}", status_code=204, dependencies=write_dependencies)
def delete(workout_id: str, user: CurrentUser, db: Database):
    db.delete(get_workout(db, user.id, workout_id, lock=True))
    db.commit()
    return Response(status_code=204)
