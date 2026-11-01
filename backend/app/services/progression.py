from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.session import SessionExercise, WorkoutSession
from app.schemas.progression import ProgressionReport, SetComparison

ELIGIBLE_TYPES = {'work', 'backoff', 'failure'}


def normalize_name(name: str) -> str:
    return ' '.join(name.casefold().split())


def meaningful(item) -> bool:
    return item.is_completed and item.weight is not None and item.repetitions > 0


def build_report(db: Session, session: WorkoutSession) -> ProgressionReport:
    counts = Counter(normalize_name(ex.name_snapshot) for ex in session.exercises)
    wanted = {normalize_name(ex.name_snapshot) for ex in session.exercises
              if counts[normalize_name(ex.name_snapshot)] == 1 and
              any(meaningful(item) and item.set_type in ELIGIBLE_TYPES for item in ex.sets)}
    baselines = {}
    if wanted:
        query = select(WorkoutSession).where(
            WorkoutSession.user_id == session.user_id,
            WorkoutSession.status == 'completed',
            WorkoutSession.id != session.id,
            WorkoutSession.finished_at <= session.started_at,
        ).options(selectinload(WorkoutSession.exercises).selectinload(SessionExercise.sets)).order_by(
            WorkoutSession.finished_at.desc(), WorkoutSession.id.desc()).execution_options(yield_per=50)
        with db.scalars(query) as previous_sessions:
            for previous in previous_sessions:
                prior_counts = Counter(normalize_name(ex.name_snapshot) for ex in previous.exercises)
                for exercise in previous.exercises:
                    name = normalize_name(exercise.name_snapshot)
                    if name in wanted and name not in baselines:
                        baselines[name] = (previous.id, exercise, prior_counts[name] > 1)
                if wanted <= baselines.keys():
                    break
    report = ProgressionReport()
    for exercise in session.exercises:
        name = normalize_name(exercise.name_snapshot)
        baseline = baselines.get(name)
        ordinals = Counter()
        for item in exercise.sets:
            ordinal = ordinals[item.set_type]
            ordinals[item.set_type] += 1
            if item.set_type not in ELIGIBLE_TYPES or not meaningful(item):
                continue
            comparison = SetComparison(exercise_id=exercise.id, exercise_name=exercise.name_snapshot,
                set_id=item.id, set_position=item.position, set_type=item.set_type,
                current_weight=item.weight, current_repetitions=item.repetitions, outcome='no_baseline')
            if counts[name] > 1:
                comparison.outcome = 'ambiguous'
            elif baseline:
                previous_id, previous_exercise, ambiguous = baseline
                comparison.previous_session_id = previous_id
                candidates = [candidate for candidate in previous_exercise.sets if candidate.set_type == item.set_type]
                if ambiguous:
                    comparison.outcome = 'ambiguous'
                elif ordinal >= len(candidates) or not meaningful(candidates[ordinal]):
                    comparison.outcome = 'not_comparable'
                else:
                    previous_set = candidates[ordinal]
                    comparison.previous_weight = previous_set.weight
                    comparison.previous_repetitions = previous_set.repetitions
                    report.compared_sets += 1
                    if item.weight > previous_set.weight and item.repetitions >= previous_set.repetitions:
                        comparison.outcome = 'weight_progress'
                        report.weight_progressions += 1
                    elif item.weight == previous_set.weight and item.repetitions > previous_set.repetitions:
                        comparison.outcome = 'repetition_progress'
                        report.repetition_progressions += 1
                    else:
                        comparison.outcome = 'no_progress'
            report.comparisons.append(comparison)
    return report


def session_report(db: Session, session: WorkoutSession) -> ProgressionReport:
    if session.progression_snapshot is not None:
        return ProgressionReport.model_validate(session.progression_snapshot)
    return build_report(db, session)
