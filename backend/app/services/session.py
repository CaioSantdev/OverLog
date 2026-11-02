from collections import Counter

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.session import PerformedSet, SessionExercise, WorkoutSession
from app.models.user import User
from app.models.workout import now
from app.schemas.session import SessionUpdate
from app.services.progression import build_report, meaningful, normalize_name
from app.services.workout import get_workout


def session_query(user_id: str):
    return select(WorkoutSession).where(WorkoutSession.user_id == user_id).options(
        selectinload(WorkoutSession.exercises).selectinload(SessionExercise.sets))


def get_session(db: Session, user_id: str, session_id: str, lock=False):
    query = session_query(user_id).where(WorkoutSession.id == session_id)
    if lock:
        query = query.with_for_update()
    session = db.scalar(query)
    if session is None:
        raise HTTPException(404, "Sessão não encontrada.")
    return session


def start_session(db: Session, user: User, workout_id: str):
    db.execute(select(User.id).where(User.id == user.id).with_for_update()).scalar_one()
    workout = get_workout(db, user.id, workout_id, lock=True)
    active = db.scalar(session_query(user.id).where(WorkoutSession.status == "in_progress"))
    if active:
        if active.workout_template_id == workout_id:
            return active
        raise HTTPException(409, "Retome ou descarte o treino em andamento antes de iniciar outro.")
    if not any(exercise.sets for exercise in workout.exercises):
        raise HTTPException(422, "Adicione pelo menos uma série ao treino antes de iniciar.")
    previous = db.scalar(session_query(user.id).where(
        WorkoutSession.workout_template_id == workout.id,
        WorkoutSession.status == "completed",
    ).order_by(WorkoutSession.finished_at.desc(), WorkoutSession.id.desc()).limit(1))
    current_counts = Counter(normalize_name(ex.name) for ex in workout.exercises)
    previous_counts = Counter(normalize_name(ex.name_snapshot) for ex in previous.exercises) if previous else Counter()
    baselines = {normalize_name(ex.name_snapshot): ex for ex in previous.exercises
                 if previous_counts[normalize_name(ex.name_snapshot)] == 1} if previous else {}
    exercises = []
    for exercise in workout.exercises:
        name = normalize_name(exercise.name)
        baseline = baselines.get(name) if current_counts[name] == 1 else None
        ordinals = Counter()
        sets = []
        for item in exercise.sets:
            ordinal = ordinals[item.set_type]
            ordinals[item.set_type] += 1
            candidates = [prior for prior in baseline.sets if prior.set_type == item.set_type] if baseline else []
            prior = candidates[ordinal] if ordinal < len(candidates) else None
            reuse = prior is not None and meaningful(prior)
            sets.append(PerformedSet(position=item.position, set_type=item.set_type,
                weight=prior.weight if reuse else item.target_weight,
                repetitions=prior.repetitions if reuse else item.target_repetitions, is_completed=False))
        exercises.append(SessionExercise(name_snapshot=exercise.name, position=exercise.position, sets=sets))
    session = WorkoutSession(user_id=user.id, workout_template_id=workout.id,
                             name_snapshot=workout.name, exercises=exercises)
    db.add(session)
    db.commit()
    return get_session(db, user.id, session.id)


def check_editable(session: WorkoutSession, revision: int):
    if session.status != "in_progress":
        raise HTTPException(409, "Esta sessão já foi encerrada e não pode ser alterada.")
    if session.revision != revision:
        raise HTTPException(409, "O treino foi atualizado em outra aba. Recarregue os dados antes de continuar.")


def update_session(db: Session, session: WorkoutSession, data: SessionUpdate):
    # A retried save after a lost response must not duplicate added sets.
    if session.last_mutation_id == str(data.mutation_id):
        return session
    check_editable(session, data.revision)
    if [exercise.id for exercise in data.exercises] != [exercise.id for exercise in session.exercises]:
        raise HTTPException(422, "Os exercícios da sessão não podem ser substituídos ou reordenados.")
    received_ids = [str(item.id) for exercise in data.exercises for item in exercise.sets]
    if len(received_ids) != len(set(received_ids)):
        raise HTTPException(422, "Há séries repetidas na sessão.")
    occupied = dict(db.execute(select(PerformedSet.id, PerformedSet.session_exercise_id).where(PerformedSet.id.in_(received_ids))).all()) if received_ids else {}
    for exercise in data.exercises:
        if any(str(item.id) in occupied and occupied[str(item.id)] != exercise.id for item in exercise.sets):
            raise HTTPException(422, "Série inválida para este exercício.")
    for existing, incoming in zip(session.exercises, data.exercises):
        previous = {item.id: item for item in existing.sets}
        items = []
        for position, data_set in enumerate(incoming.sets):
            item = previous.get(str(data_set.id)) or PerformedSet(id=str(data_set.id))
            item.position, item.set_type = position, data_set.set_type
            item.weight, item.repetitions = data_set.weight, data_set.repetitions
            item.is_completed = data_set.is_completed
            items.append(item)
        existing.sets = items
    session.revision += 1
    session.last_mutation_id = str(data.mutation_id)
    db.commit()
    db.expire_all()
    return get_session(db, session.user_id, session.id)


def close_session(db: Session, session: WorkoutSession, revision: int, status: str):
    if session.status == status:
        return session  # Retrying finish/discard is safe.
    check_editable(session, revision)
    if status == "completed" and session.completed_sets == 0:
        raise HTTPException(422, "Conclua pelo menos uma série antes de finalizar o treino.")
    session.status, session.finished_at = status, now()
    session.revision += 1
    if status == "completed":
        session.progression_snapshot = build_report(db, session).model_dump(mode="json")
    db.commit()
    return get_session(db, session.user_id, session.id)
