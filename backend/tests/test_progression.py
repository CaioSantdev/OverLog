from uuid import uuid4

import pytest

from app.models.session import WorkoutSession
from test_auth import client
from test_sessions import payload
from test_workouts import sign_in


def plan(weight='60.00', reps=8, kind='work', name='Supino reto'):
    return {'name': 'Plano', 'exercises': [{'name': name, 'sets': [{'set_type': kind, 'target_weight': weight, 'target_repetitions': reps}]}]}


def complete(c, data, pending=()):
    workout = c.post('/api/workouts', json=data).json()
    session = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
    body = payload(session)
    for ex_index, ex in enumerate(body['exercises']):
        for index, item in enumerate(ex['sets']):
            item['is_completed'] = (ex_index, index) not in pending
    saved = c.put('/api/sessions/' + session['id'], json=body)
    assert saved.status_code == 200
    finished = c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved.json()['revision']})
    assert finished.status_code == 200
    return workout, finished.json()


def report(c, session):
    response = c.get('/api/sessions/' + session['id'] + '/progression')
    assert response.status_code == 200
    return response.json()


@pytest.mark.parametrize('weight,reps,outcome', [
    ('65', 8, 'weight_progress'), ('65', 10, 'weight_progress'),
    ('60', 10, 'repetition_progress'), ('60', 8, 'no_progress'),
    ('65', 7, 'no_progress'), ('55', 10, 'no_progress'),
])
def test_progression_rules(client, weight, reps, outcome):
    c, _ = client
    sign_in(c)
    _, previous = complete(c, plan())
    _, current = complete(c, plan(weight, reps))
    result = report(c, current)
    assert result['compared_sets'] == 1
    item = result['comparisons'][0]
    assert item['outcome'] == outcome
    assert item['previous_session_id'] == previous['id']
    assert item['previous_weight'] == '60.00'
    assert result['weight_progressions'] == int(outcome == 'weight_progress')
    assert result['repetition_progressions'] == int(outcome == 'repetition_progress')


def test_first_session_and_exact_decimal_weight(client):
    c, _ = client
    sign_in(c)
    _, first = complete(c, plan('60.25'))
    assert report(c, first)['comparisons'][0]['outcome'] == 'no_baseline'
    _, second = complete(c, plan('60.26'))
    result = report(c, second)
    assert result['weight_progressions'] == 1
    assert result['comparisons'][0]['current_weight'] == '60.26'
    assert second['weight_progressions'] == 1
    assert second['repetition_progressions'] == 0


def test_latest_matching_exercise_across_plans_and_names(client):
    c, _ = client
    sign_in(c)
    complete(c, plan('40'))
    _, latest = complete(c, plan('60', name=' SUPINO   RETO '))
    complete(c, plan('99', name='Outro exercício'))
    _, current = complete(c, plan('55', name='supino reto'))
    result = report(c, current)
    assert result['comparisons'][0]['previous_session_id'] == latest['id']
    assert result['comparisons'][0]['outcome'] == 'no_progress'


@pytest.mark.parametrize('kind', ['warmup', 'feeder'])
def test_warmup_and_feeder_do_not_award(client, kind):
    c, _ = client
    sign_in(c)
    complete(c, plan('40', kind=kind))
    _, current = complete(c, plan('60', kind=kind))
    assert report(c, current)['comparisons'] == []


def test_different_types_pending_sets_and_zero_reps(client):
    c, _ = client
    sign_in(c)
    previous_plan = plan()
    previous_plan['exercises'][0]['sets'].append({'set_type': 'work', 'target_weight': '50', 'target_repetitions': 8})
    complete(c, previous_plan, pending={(0, 0)})
    current_plan = plan('65')
    current_plan['exercises'][0]['sets'].append({'set_type': 'work', 'target_weight': '55', 'target_repetitions': 8})
    _, current = complete(c, current_plan)
    result = report(c, current)
    assert [item['outcome'] for item in result['comparisons']] == ['not_comparable', 'weight_progress']
    _, different = complete(c, plan('70', kind='backoff'))
    assert report(c, different)['comparisons'][0]['outcome'] == 'not_comparable'
    # An executed attempt with zero reps must not generate a progression.
    workout = c.post('/api/workouts', json=plan('80')).json()
    session = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
    body = payload(session)
    body['exercises'][0]['sets'][0].update(repetitions=0, is_completed=True)
    saved = c.put('/api/sessions/' + session['id'], json=body).json()
    ended = c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']}).json()
    assert report(c, ended)['comparisons'] == []


def test_duplicate_names_are_not_guessed(client):
    c, _ = client
    sign_in(c)
    duplicate = plan('40')
    duplicate['exercises'].append({'name': 'supino reto', 'sets': [{'set_type': 'work', 'target_weight': '45', 'target_repetitions': 8}]})
    complete(c, duplicate)
    _, unique = complete(c, plan('60'))
    assert report(c, unique)['comparisons'][0]['outcome'] == 'ambiguous'
    _, current_duplicate = complete(c, duplicate)
    assert all(item['outcome'] == 'ambiguous' for item in report(c, current_duplicate)['comparisons'])


def test_persisted_report_is_immutable_and_retry_safe(client):
    c, db = client
    sign_in(c)
    previous_workout, previous = complete(c, plan())
    current_workout, current = complete(c, plan('65'))
    original = report(c, current)
    assert db.get(WorkoutSession, current['id']).progression_snapshot == original
    c.delete('/api/workouts/' + previous_workout['id'])
    c.delete('/api/workouts/' + current_workout['id'])
    repeated = c.post('/api/sessions/' + current['id'] + '/finish', json={'revision': 0})
    assert repeated.status_code == 200
    assert report(c, current) == original
    assert c.get('/api/sessions').json()[0]['weight_progressions'] == 1
    # Legacy sessions are readable without mutating the database.
    stored = db.get(WorkoutSession, current['id'])
    stored.progression_snapshot = None
    db.commit()
    assert report(c, current) == original
    assert db.get(WorkoutSession, current['id']).progression_snapshot is None


def test_user_isolation_and_active_session(client):
    c, _ = client
    sign_in(c)
    _, first = complete(c, plan())
    sign_in(c, 'other@example.com')
    assert c.get('/api/sessions/' + first['id'] + '/progression').status_code == 404
    _, own = complete(c, plan('65'))
    assert report(c, own)['comparisons'][0]['outcome'] == 'no_baseline'
    workout = c.post('/api/workouts', json=plan()).json()
    active = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
    assert c.get('/api/sessions/' + active['id'] + '/progression').status_code == 409
    c.post('/api/sessions/' + active['id'] + '/discard', json={'revision': 0})
    assert c.get('/api/sessions/' + active['id'] + '/progression').status_code == 409
    c.cookies.clear()
    assert c.get('/api/sessions/' + own['id'] + '/progression').status_code == 401
