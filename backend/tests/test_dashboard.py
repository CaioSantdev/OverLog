from datetime import datetime, timezone
from decimal import Decimal

from app.models.session import WorkoutSession
from test_auth import client
from test_progression import complete, plan
from test_workouts import sign_in


def test_empty_dashboard_has_real_zero_values(client):
    c, _ = client
    sign_in(c)
    response = c.get('/api/dashboard?timezone=UTC')
    assert response.status_code == 200
    result = response.json()
    assert result['completed_sessions'] == result['sessions_this_week'] == result['progressions'] == 0
    assert len(result['weeks']) == 12
    assert all(Decimal(week['volume']) == 0 for week in result['weeks'])
    assert result['week_days'] == [0] * 7
    assert response.headers['cache-control'] == 'no-store'


def test_dashboard_counts_only_own_completed_performed_sets(client):
    c, _ = client
    sign_in(c)
    complete(c, plan('60', 8))
    data = plan('65', 10)
    data['exercises'][0]['sets'].append({'set_type': 'work', 'target_weight': '100', 'target_repetitions': 99})
    complete(c, data, pending={(0, 1)})
    result = c.get('/api/dashboard?timezone=UTC').json()
    assert result['completed_sessions'] == result['sessions_this_week'] == 2
    assert result['progressions'] == 1
    assert sum(Decimal(week['volume']) for week in result['weeks']) == Decimal('1130')
    assert sum(result['week_days']) == 2
    sign_in(c, 'other-dashboard@example.com')
    assert c.get('/api/dashboard').json()['completed_sessions'] == 0
    assert c.get('/api/dashboard').json()['progressions'] == 0
    c.cookies.clear()
    assert c.get('/api/dashboard').status_code == 401


def test_week_boundaries_respect_requested_timezone(client, monkeypatch):
    from app.api import dashboard

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 11, 2, 12, tzinfo=timezone.utc).astimezone(tz or timezone.utc)
    c, db = client
    sign_in(c)
    _, session = complete(c, plan())
    stored = db.get(WorkoutSession, session['id'])
    stored.started_at = datetime(2026, 11, 2, 2, 30, tzinfo=timezone.utc)
    stored.finished_at = datetime(2026, 11, 2, 3, tzinfo=timezone.utc)
    db.commit()
    monkeypatch.setattr(dashboard, 'datetime', Clock)
    assert c.get('/api/dashboard?timezone=UTC').json()['sessions_this_week'] == 1
    assert c.get('/api/dashboard?timezone=America/Sao_Paulo').json()['sessions_this_week'] == 0
    assert c.get('/api/dashboard?timezone=Invalid/Zone').status_code == 422
