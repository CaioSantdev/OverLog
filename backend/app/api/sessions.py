from fastapi import APIRouter, Depends, Query, Response

from app.api.dependencies import CurrentUser, Database, require_same_origin_header
from app.models.session import WorkoutSession
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
    return db.scalars(session_query(user.id).where(WorkoutSession.status == "completed")
        .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id).offset(offset).limit(limit)).all()


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
