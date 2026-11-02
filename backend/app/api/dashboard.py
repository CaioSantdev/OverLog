from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.dependencies import CurrentUser, Database
from app.models.session import PerformedSet, SessionExercise, WorkoutSession

router = APIRouter(prefix='/dashboard', tags=['Dashboard'])


class WeekVolume(BaseModel):
    week_start: str
    sessions: int
    volume: Decimal


class DashboardSummary(BaseModel):
    completed_sessions: int
    sessions_this_week: int
    progressions: int
    week_days: list[int]
    weeks: list[WeekVolume]
    timezone: str


@router.get('', response_model=DashboardSummary)
def summary(user: CurrentUser, db: Database,
            timezone_name: str = Query('America/Sao_Paulo', alias='timezone', max_length=64)):
    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, 'Fuso horário inválido.') from None
    today = datetime.now(zone).date()
    monday = today - timedelta(days=today.weekday())
    oldest = monday - timedelta(weeks=11)
    week_start = datetime.combine(monday, time.min, zone).astimezone(timezone.utc)
    next_week = datetime.combine(monday + timedelta(days=7), time.min, zone).astimezone(timezone.utc)
    window_start = datetime.combine(oldest, time.min, zone).astimezone(timezone.utc)
    conditions = (WorkoutSession.user_id == user.id, WorkoutSession.status == 'completed')
    total, this_week, weight, repetitions = db.execute(select(
        func.count(WorkoutSession.id),
        func.count(WorkoutSession.id).filter(WorkoutSession.started_at >= week_start, WorkoutSession.started_at < next_week),
        func.coalesce(func.sum(WorkoutSession.progression_snapshot['weight_progressions'].as_integer()), 0),
        func.coalesce(func.sum(WorkoutSession.progression_snapshot['repetition_progressions'].as_integer()), 0),
    ).where(*conditions)).one()
    recent = db.execute(select(WorkoutSession.id, WorkoutSession.started_at).where(
        *conditions, WorkoutSession.started_at >= window_start)).all()
    volumes = dict(db.execute(select(WorkoutSession.id, func.sum(PerformedSet.weight * PerformedSet.repetitions))
        .join(SessionExercise, SessionExercise.workout_session_id == WorkoutSession.id)
        .join(PerformedSet, PerformedSet.session_exercise_id == SessionExercise.id)
        .where(*conditions, WorkoutSession.started_at >= window_start,
               PerformedSet.is_completed.is_(True), PerformedSet.repetitions > 0)
        .group_by(WorkoutSession.id)).all())
    weeks = [WeekVolume(week_start=(oldest + timedelta(weeks=index)).isoformat(), sessions=0, volume=Decimal('0'))
             for index in range(12)]
    days = [0] * 7
    for session_id, started_at in recent:
        started_at = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
        day = started_at.astimezone(zone).date()
        index = (day - oldest).days // 7
        if 0 <= index < 12:
            weeks[index].sessions += 1
            weeks[index].volume += volumes.get(session_id) or Decimal('0')
        if monday <= day < monday + timedelta(days=7):
            days[day.weekday()] += 1
    return DashboardSummary(completed_sessions=total, sessions_this_week=this_week,
        progressions=int(weight + repetitions), week_days=days, weeks=weeks, timezone=timezone_name)
