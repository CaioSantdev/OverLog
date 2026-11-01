from fastapi import HTTPException, APIRouter, Depends, Query, Response

from app.api.dependencies import CurrentUser, Database, require_same_origin_header
from app.schemas.progression import ProgressionReport
from app.services.progression import session_report
from sqlalchemy import func, select
from app.models.session import WorkoutSession, SessionExercise, PerformedSet
from app.schemas.session import SessionAction, SessionPublic, SessionStart, SessionSummary, SessionUpdate
from app.services.session import close_session, get_session, session_query, start_session, update_session

router = APIRouter(prefix="/sessions", tags=["Sessões"])
writes = [Depends(require_same_origin_header)]


@router.get("/active", response_model=SessionPublic | None)
def active(user: CurrentUser, db: Database, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return db.scalar(session_query(user.id).where(WorkoutSession.status == "in_progress"))


@router.get("", response_model=list[SessionSummary])
def history(user: CurrentUser, db: Database, response: Response, offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    response.headers["Cache-Control"] = "no-store"
    rows = db.execute(select(WorkoutSession, func.count(PerformedSet.id).filter(PerformedSet.is_completed))
        .outerjoin(SessionExercise, SessionExercise.workout_session_id == WorkoutSession.id)
        .outerjoin(PerformedSet, PerformedSet.session_exercise_id == SessionExercise.id)
        .where(WorkoutSession.user_id == user.id, WorkoutSession.status == "completed")
        .group_by(WorkoutSession.id).order_by(WorkoutSession.started_at.desc(), WorkoutSession.id)
        .offset(offset).limit(limit)).all()
    return [SessionSummary(id=session.id, workout_template_id=session.workout_template_id,
        name_snapshot=session.name_snapshot, status=session.status, started_at=session.started_at,
        finished_at=session.finished_at, duration_seconds=session.duration_seconds,
        completed_sets=count, revision=session.revision, weight_progressions=session.weight_progressions,
        repetition_progressions=session.repetition_progressions) for session, count in rows]


@router.post("", response_model=SessionPublic, dependencies=writes)
def start(data: SessionStart, user: CurrentUser, db: Database):
    return start_session(db, user, data.workout_template_id)


@router.get("/{session_id}", response_model=SessionPublic)
def detail(session_id: str, user: CurrentUser, db: Database, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return get_session(db, user.id, session_id)


@router.put("/{session_id}", response_model=SessionPublic, dependencies=writes)
def update(session_id: str, data: SessionUpdate, user: CurrentUser, db: Database):
    return update_session(db, get_session(db, user.id, session_id, lock=True), data)


@router.post("/{session_id}/finish", response_model=SessionPublic, dependencies=writes)
def finish(session_id: str, data: SessionAction, user: CurrentUser, db: Database):
    return close_session(db, get_session(db, user.id, session_id, lock=True), data.revision, "completed")


@router.post("/{session_id}/discard", response_model=SessionPublic, dependencies=writes)
def discard(session_id: str, data: SessionAction, user: CurrentUser, db: Database):
    return close_session(db, get_session(db, user.id, session_id, lock=True), data.revision, "discarded")


@router.get("/{session_id}/progression", response_model=ProgressionReport)
def progression(session_id: str, user: CurrentUser, db: Database, response: Response):
    response.headers["Cache-Control"] = "no-store"
    session = get_session(db, user.id, session_id)
    if session.status != "completed":
        raise HTTPException(409, "A comparação fica disponível após finalizar o treino.")
    return session_report(db, session)
