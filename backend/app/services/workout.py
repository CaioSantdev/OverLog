from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.workout import PlannedSet, TemplateExercise, WorkoutTemplate, now
from app.schemas.workout import WorkoutInput


def query_workouts(user_id: str):
    return select(WorkoutTemplate).where(WorkoutTemplate.user_id == user_id).options(
        selectinload(WorkoutTemplate.exercises).selectinload(TemplateExercise.sets)
    )


def get_workout(db: Session, user_id: str, workout_id: str, lock=False):
    query = query_workouts(user_id).where(WorkoutTemplate.id == workout_id)
    if lock:
        query = query.with_for_update()
    workout = db.scalar(query)
    if workout is None:
        raise HTTPException(404, "Treino não encontrado.")
    return workout


def apply_plan(workout: WorkoutTemplate, data: WorkoutInput):
    # Validate every supplied ID before changing the aggregate.
    existing = {exercise.id: exercise for exercise in workout.exercises}
    seen_exercises, seen_sets = set(), set()
    for exercise in data.exercises:
        if exercise.id is not None:
            if exercise.id not in existing or exercise.id in seen_exercises:
                raise HTTPException(422, "Exercício inválido ou repetido neste treino.")
            seen_exercises.add(exercise.id)
        existing_sets = {item.id: item for item in existing[exercise.id].sets} if exercise.id else {}
        for item in exercise.sets:
            if item.id is not None:
                if item.id not in existing_sets or item.id in seen_sets:
                    raise HTTPException(422, "Série inválida ou repetida neste exercício.")
                seen_sets.add(item.id)
    exercises = []
    for position, exercise_data in enumerate(data.exercises):
        exercise = existing.get(exercise_data.id) or TemplateExercise()
        exercise.name, exercise.position = exercise_data.name, position
        existing_sets = {item.id: item for item in exercise.sets}
        sets = []
        for set_position, item in enumerate(exercise_data.sets):
            planned = existing_sets.get(item.id) or PlannedSet()
            planned.position = set_position
            planned.set_type = item.set_type
            planned.target_repetitions = item.target_repetitions
            planned.target_weight = item.target_weight
            sets.append(planned)
        exercise.sets = sets
        exercises.append(exercise)
    workout.name = data.name
    workout.exercises = exercises
    workout.updated_at = now()


def create_workout(db: Session, user: User, data: WorkoutInput):
    # Serialize creation per user; the six unique slots also enforce the limit in PostgreSQL.
    db.execute(select(User.id).where(User.id == user.id).with_for_update()).scalar_one()
    positions = set(db.scalars(select(WorkoutTemplate.position).where(WorkoutTemplate.user_id == user.id)))
    free_position = next((index for index in range(6) if index not in positions), None)
    if free_position is None:
        raise HTTPException(409, "Você pode cadastrar até seis treinos. Exclua um para criar outro.")
    workout = WorkoutTemplate(user_id=user.id, position=free_position)
    apply_plan(workout, data)
    db.add(workout)
    db.commit()
    return get_workout(db, user.id, workout.id)
