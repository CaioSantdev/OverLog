import copy
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.models.session import PerformedSet, WorkoutSession
from test_auth import client
from test_workouts import PLAN, editable, sign_in


def start(c):
    workout = c.post('/api/workouts', json=PLAN).json()
    response = c.post('/api/sessions', json={'workout_template_id': workout['id']})
    assert response.status_code == 200
    return workout, response.json()


def payload(session):
    return {'revision': session['revision'], 'mutation_id': str(uuid4()), 'exercises': [
        {'id': ex['id'], 'sets': [
            {key: item[key] for key in ('id', 'set_type', 'weight', 'repetitions', 'is_completed')}
            for item in ex['sets']
        ]} for ex in session['exercises']
    ]}


def save(c, session, data):
    return c.put('/api/sessions/' + session['id'], json=data)


def test_snapshot_is_independent_of_template_edit_and_delete(client):
    c, _ = client
    sign_in(c)
    workout, session = start(c)
    assert session['name_snapshot'] == workout['name']
    assert session['exercises'][0]['id'] != workout['exercises'][0]['id']
    assert session['exercises'][0]['sets'][0]['weight'] == '20.25'
    assert session['status'] == 'in_progress'
    assert session['finished_at'] is None
    update = editable(workout)
    update['name'] = 'Plano alterado'
    update['exercises'] = []
    assert c.put('/api/workouts/' + workout['id'], json=update).status_code == 200
    assert c.get('/api/sessions/' + session['id']).json()['exercises'] == session['exercises']
    assert c.delete('/api/workouts/' + workout['id']).status_code == 204
    recovered = c.get('/api/sessions/' + session['id']).json()
    assert recovered['workout_template_id'] is None
    assert recovered['name_snapshot'] == workout['name']
    assert recovered['exercises'] == session['exercises']


def test_save_resume_add_remove_and_finish(client):
    c, _ = client
    sign_in(c)
    workout, session = start(c)
    data = payload(session)
    first = data['exercises'][0]['sets'][0]
    first.update(weight='25.75', repetitions=12, set_type='feeder', is_completed=True)
    new_id = str(uuid4())
    data['exercises'][0]['sets'].append({'id': new_id, 'weight': '65.50', 'repetitions': 8, 'set_type': 'work', 'is_completed': True})
    data['exercises'][1]['sets'] = []
    updated = save(c, session, data)
    assert updated.status_code == 200
    saved = updated.json()
    assert saved['revision'] == 1
    assert saved['completed_sets'] == 2
    assert saved['last_mutation_id'] == data['mutation_id']
    assert c.get('/api/sessions/active').json()['id'] == session['id']
    assert c.get('/api/sessions/' + session['id']).json()['exercises'] == saved['exercises']
    assert c.get('/api/workouts/' + workout['id']).json() == workout
    finished = c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']})
    assert finished.status_code == 200
    result = finished.json()
    assert result['status'] == 'completed'
    assert result['finished_at'] is not None
    assert result['duration_seconds'] >= 0
    assert result['completed_sets'] == 2
    assert result['exercises'][0]['sets'][0]['weight'] == '25.75'
    assert result['exercises'][0]['sets'][2]['id'] == new_id
    assert c.get('/api/sessions/active').json() is None
    assert c.get('/api/sessions').json()[0]['id'] == session['id']
    assert c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']}).json() == result
    assert save(c, result, payload(result)).status_code == 409
    assert c.post('/api/sessions/' + session['id'] + '/discard', json={'revision': result['revision']}).status_code == 409


def test_single_active_session_and_discard(client):
    c, _ = client
    sign_in(c)
    workout, session = start(c)
    assert c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()['id'] == session['id']
    second = c.post('/api/workouts', json=PLAN).json()
    assert c.post('/api/sessions', json={'workout_template_id': second['id']}).status_code == 409
    action = '/api/sessions/' + session['id'] + '/discard'
    response = c.post(action, json={'revision': session['revision']})
    assert response.status_code == 200
    assert response.json()['status'] == 'discarded'
    assert c.post(action, json={'revision': session['revision']}).status_code == 200
    assert c.get('/api/sessions').json() == []
    assert c.get('/api/sessions/active').json() is None
    assert c.post('/api/sessions', json={'workout_template_id': second['id']}).status_code == 200


def test_save_idempotency_and_stale_revision(client):
    c, db = client
    sign_in(c)
    _, session = start(c)
    data = payload(session)
    data['exercises'][0]['sets'].append({'id': str(uuid4()), 'set_type': 'work', 'weight': '0', 'repetitions': 0, 'is_completed': True})
    first = save(c, session, data)
    retried = save(c, session, data)
    assert first.status_code == retried.status_code == 200
    assert first.json() == retried.json()
    assert db.scalar(select(func.count()).select_from(PerformedSet)) == 4
    stale = copy.deepcopy(data)
    stale['mutation_id'] = str(uuid4())
    stale['exercises'][0]['sets'][0]['weight'] = '100'
    assert save(c, session, stale).status_code == 409
    assert c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': 0}).status_code == 409
    assert c.post('/api/sessions/' + session['id'] + '/discard', json={'revision': 0}).status_code == 409


def test_foreign_sessions_and_sets_are_rejected(client):
    c, _ = client
    sign_in(c)
    workout, session = start(c)
    sign_in(c, 'second@example.com')
    assert c.post('/api/sessions', json={'workout_template_id': workout['id']}).status_code == 404
    assert c.get('/api/sessions').json() == []
    assert c.get('/api/sessions/active').json() is None
    base = '/api/sessions/' + session['id']
    assert c.get(base).status_code == 404
    assert c.put(base, json=payload(session)).status_code == 404
    for action in ('finish', 'discard'):
        assert c.post(base + '/' + action, json={'revision': 0}).status_code == 404
    _, own = start(c)
    data = payload(own)
    data['exercises'][0]['sets'][0]['id'] = session['exercises'][0]['sets'][0]['id']
    assert save(c, own, data).status_code == 422
    assert c.get('/api/sessions/' + own['id']).json()['revision'] == 0


@pytest.mark.parametrize('mode', ['foreign_exercise', 'duplicate_set', 'missing_exercise', 'move_set'])
def test_invalid_structure(client, mode):
    c, _ = client
    sign_in(c)
    _, session = start(c)
    data = payload(session)
    if mode == 'foreign_exercise': data['exercises'][0]['id'] = str(uuid4())
    if mode == 'duplicate_set': data['exercises'][0]['sets'].append(data['exercises'][0]['sets'][0])
    if mode == 'missing_exercise': data['exercises'].pop()
    if mode == 'move_set': data['exercises'][1]['sets'].append(data['exercises'][0]['sets'].pop())
    assert save(c, session, data).status_code == 422
    assert c.get('/api/sessions/' + session['id']).json()['exercises'] == session['exercises']


@pytest.mark.parametrize('field,value', [('weight', '-1'), ('weight', '1.001'), ('weight', '100000'), ('weight', 'NaN'), ('repetitions', -1), ('repetitions', 1000), ('repetitions', 1.5), ('is_completed', 'yes'), ('id', 'not-a-uuid')])
def test_invalid_set_values(client, field, value):
    c, _ = client
    sign_in(c)
    _, session = start(c)
    data = payload(session)
    data['exercises'][0]['sets'][0][field] = value
    assert save(c, session, data).status_code == 422


def test_completed_set_requires_weight_and_finish_requires_completion(client):
    c, _ = client
    sign_in(c)
    _, session = start(c)
    assert c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': 0}).status_code == 422
    data = payload(session)
    data['exercises'][1]['sets'][0]['is_completed'] = True
    assert save(c, session, data).status_code == 422
    empty = c.post('/api/workouts', json={'name': 'Vazio'}).json()
    c.post('/api/sessions/' + session['id'] + '/discard', json={'revision': 0})
    assert c.post('/api/sessions', json={'workout_template_id': empty['id']}).status_code == 422


def test_auth_and_csrf(client):
    c, _ = client
    for path in ('/api/sessions', '/api/sessions/active', '/api/sessions/missing'):
        assert c.get(path).status_code == 401
    assert c.post('/api/sessions', json={'workout_template_id': 'missing'}).status_code == 401
    sign_in(c)
    _, session = start(c)
    c.headers.pop('X-Requested-With')
    assert c.post('/api/sessions', json={'workout_template_id': 'missing'}).status_code == 403
    assert save(c, session, payload(session)).status_code == 403
    for action in ('finish', 'discard'):
        assert c.post('/api/sessions/' + session['id'] + '/' + action, json={'revision': 0}).status_code == 403


def test_pagination(client):
    c, _ = client
    sign_in(c)
    workout = c.post('/api/workouts', json=PLAN).json()
    for _ in range(3):
        session = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
        data = payload(session)
        data['exercises'][0]['sets'][0]['is_completed'] = True
        saved = save(c, session, data).json()
        c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']})
    assert len(c.get('/api/sessions?limit=2').json()) == 2
    assert len(c.get('/api/sessions?offset=2&limit=2').json()) == 1
    assert c.get('/api/sessions?limit=101').status_code == 422
    assert c.get('/api/sessions?offset=-1').status_code == 422


def test_duration_and_finished_snapshot_survive_plan_deletion(client):
    from datetime import datetime, timedelta, timezone

    c, db = client
    sign_in(c)
    workout, session = start(c)
    stored = db.get(WorkoutSession, session['id'])
    stored.started_at = datetime.now(timezone.utc) - timedelta(seconds=125)
    db.commit()
    data = payload(session)
    data['exercises'][0]['sets'][0]['is_completed'] = True
    saved = save(c, session, data).json()
    finished = c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']}).json()
    assert 125 <= finished['duration_seconds'] <= 130
    c.delete('/api/workouts/' + workout['id'])
    snapshot = c.get('/api/sessions/' + session['id']).json()
    assert snapshot['workout_template_id'] is None
    assert snapshot['exercises'] == finished['exercises']
    assert snapshot['duration_seconds'] == finished['duration_seconds']


def test_session_series_limit(client):
    c, _ = client
    sign_in(c)
    _, session = start(c)
    data = payload(session)
    source = data['exercises'][0]['sets'][0]
    data['exercises'][0]['sets'] = [{**source, 'id': str(uuid4())} for _ in range(61)]
    assert save(c, session, data).status_code == 422
