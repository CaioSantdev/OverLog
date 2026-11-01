import copy

import pytest
from sqlalchemy import func, select

from app.models.workout import PlannedSet, TemplateExercise, WorkoutTemplate
from test_auth import ACCOUNT, client  # reuse the isolated database fixture

PLAN = {
    'name': 'Peito e tríceps',
    'exercises': [
        {'name': 'Supino reto', 'sets': [
            {'set_type': 'warmup', 'target_repetitions': 15, 'target_weight': '20.25'},
            {'set_type': 'work', 'target_repetitions': 8, 'target_weight': '60.50'},
        ]},
        {'name': 'Tríceps francês', 'sets': [{'set_type': 'failure', 'target_repetitions': 10}]},
    ],
}


def sign_in(c, email=ACCOUNT['email']):
    return c.post('/api/auth/register', json={**ACCOUNT, 'email': email}).json()


def editable(workout):
    return {'name': workout['name'], 'exercises': [
        {'id': ex['id'], 'name': ex['name'], 'sets': [
            {key: item[key] for key in ('id', 'set_type', 'target_repetitions', 'target_weight')}
            for item in ex['sets']
        ]} for ex in workout['exercises']
    ]}


def test_complete_plan_and_reordering_keep_ids(client):
    c, _ = client
    sign_in(c)
    response = c.post('/api/workouts', json=PLAN)
    assert response.status_code == 201
    original = response.json()
    assert original['exercises'][0]['sets'][0]['target_weight'] == '20.25'
    assert original['exercises'][1]['sets'][0]['target_weight'] is None
    update = editable(original)
    update['name'] = 'Treino A atualizado'
    update['exercises'].reverse()
    update['exercises'][1]['sets'].reverse()
    update['exercises'][1]['sets'][0]['target_weight'] = '62.75'
    update['exercises'][1]['sets'][0]['target_repetitions'] = 9
    updated = c.put('/api/workouts/' + original['id'], json=update)
    assert updated.status_code == 200
    saved = c.get('/api/workouts/' + original['id']).json()
    assert saved['name'] == update['name']
    assert saved['exercises'][0]['id'] == original['exercises'][1]['id']
    assert [ex['position'] for ex in saved['exercises']] == [0, 1]
    sets = saved['exercises'][1]['sets']
    assert [s['position'] for s in sets] == [0, 1]
    assert sets[0]['id'] == original['exercises'][0]['sets'][1]['id']
    assert sets[0]['target_weight'] == '62.75'
    assert sets[0]['target_repetitions'] == 9
    assert len(c.get('/api/workouts').json()) == 1


def test_six_workouts_and_freed_slot(client):
    c, _ = client
    sign_in(c)
    workouts = [c.post('/api/workouts', json={'name': str(i)}) for i in range(6)]
    assert all(w.status_code == 201 for w in workouts)
    assert c.post('/api/workouts', json={'name': 'Sétimo'}).status_code == 409
    removed = workouts[2].json()
    assert c.delete('/api/workouts/' + removed['id']).status_code == 204
    replacement = c.post('/api/workouts', json={'name': 'Substituto'})
    assert replacement.status_code == 201
    assert replacement.json()['position'] == 2
    assert len(c.get('/api/workouts').json()) == 6


def test_isolation_and_nested_id_injection(client):
    c, _ = client
    sign_in(c)
    first = c.post('/api/workouts', json=PLAN).json()
    sign_in(c, 'other@example.com')
    assert c.get('/api/workouts').json() == []
    for method, body in [('get', None), ('put', PLAN), ('delete', None)]:
        kwargs = {'json': body} if body is not None else {}
        assert getattr(c, method)('/api/workouts/' + first['id'], **kwargs).status_code == 404
    own = c.post('/api/workouts', json=PLAN).json()
    data = editable(own)
    data['exercises'][0]['id'] = first['exercises'][0]['id']
    assert c.put('/api/workouts/' + own['id'], json=data).status_code == 422
    data = editable(own)
    data['exercises'][0]['sets'][0]['id'] = first['exercises'][0]['sets'][0]['id']
    assert c.put('/api/workouts/' + own['id'], json=data).status_code == 422
    assert c.get('/api/workouts/' + own['id']).json() == own


def test_remove_children_and_delete_cascade(client):
    c, db = client
    sign_in(c)
    workout = c.post('/api/workouts', json=PLAN).json()
    data = editable(workout)
    data['exercises'] = [data['exercises'][0]]
    data['exercises'][0]['sets'] = [data['exercises'][0]['sets'][0]]
    assert c.put('/api/workouts/' + workout['id'], json=data).status_code == 200
    assert db.scalar(select(func.count()).select_from(TemplateExercise)) == 1
    assert db.scalar(select(func.count()).select_from(PlannedSet)) == 1
    assert c.delete('/api/workouts/' + workout['id']).status_code == 204
    for model in (WorkoutTemplate, TemplateExercise, PlannedSet):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert c.get('/api/workouts/' + workout['id']).status_code == 404


@pytest.mark.parametrize('field,value', [
    ('set_type', 'invalid'), ('target_repetitions', 0), ('target_repetitions', 1.5),
    ('target_repetitions', True), ('target_repetitions', 1000),
    ('target_weight', '-0.01'), ('target_weight', '20.001'),
    ('target_weight', '100000'), ('target_weight', 'NaN'),
])
def test_invalid_sets_are_rejected(client, field, value):
    c, _ = client
    sign_in(c)
    data = copy.deepcopy(PLAN)
    data['exercises'][0]['sets'][0][field] = value
    assert c.post('/api/workouts', json=data).status_code == 422
    assert c.get('/api/workouts').json() == []


@pytest.mark.parametrize('data', [
    {'name': '   '}, {'name': 'x' * 101},
    {'name': 'A', 'exercises': [{'name': ' '}]},
    {'name': 'A', 'exercises': [{'name': 'X'}] * 101},
    {'name': 'A', 'exercises': [{'name': 'X', 'sets': [{'target_repetitions': 10}] * 31}]},
])
def test_invalid_workout(client, data):
    c, _ = client
    sign_in(c)
    assert c.post('/api/workouts', json=data).status_code == 422


def test_duplicate_ids_and_new_items(client):
    c, _ = client
    sign_in(c)
    workout = c.post('/api/workouts', json=PLAN).json()
    data = editable(workout)
    data['exercises'].append(data['exercises'][0])
    assert c.put('/api/workouts/' + workout['id'], json=data).status_code == 422
    data = editable(workout)
    data['exercises'][0]['sets'].append(data['exercises'][0]['sets'][0])
    assert c.put('/api/workouts/' + workout['id'], json=data).status_code == 422
    data = editable(workout)
    data['exercises'].append({'name': 'Novo', 'sets': [{'set_type': 'backoff', 'target_repetitions': 12, 'target_weight': '0'}]})
    data['exercises'][0]['sets'].append({'set_type': 'feeder', 'target_repetitions': 5})
    saved = c.put('/api/workouts/' + workout['id'], json=data)
    assert saved.status_code == 200
    assert len(saved.json()['exercises']) == 3
    assert len(saved.json()['exercises'][0]['sets']) == 3


def test_authentication_and_csrf(client):
    c, _ = client
    for method, path, body in [('get', '', None), ('post', '', PLAN), ('get', '/missing', None), ('put', '/missing', PLAN), ('delete', '/missing', None)]:
        assert getattr(c, method)('/api/workouts' + path, **({'json': body} if body else {})).status_code == 401
    sign_in(c)
    workout = c.post('/api/workouts', json=PLAN).json()
    c.headers.pop('X-Requested-With')
    assert c.post('/api/workouts', json=PLAN).status_code == 403
    assert c.put('/api/workouts/' + workout['id'], json=PLAN).status_code == 403
    assert c.delete('/api/workouts/' + workout['id']).status_code == 403
