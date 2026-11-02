from copy import deepcopy

from test_auth import client
from test_sessions import payload, save, start
from test_workouts import PLAN, editable, sign_in


def finish(c, session, values):
    data = payload(session)
    for item, (weight, reps, completed) in zip(data['exercises'][0]['sets'], values):
        item.update(weight=weight, repetitions=reps, is_completed=completed)
    saved = save(c, session, data)
    assert saved.status_code == 200
    response = c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved.json()['revision']})
    assert response.status_code == 200
    return response.json()


def begin(c, workout):
    response = c.post('/api/sessions', json={'workout_template_id': workout['id']})
    assert response.status_code == 200
    return response.json()


def test_prefills_latest_completed_values_without_marking_or_changing_plan(client):
    c, _ = client
    sign_in(c)
    workout, first = start(c)
    finish(c, first, [('0', 18, True), ('65.25', 9, True)])
    second = begin(c, workout)
    assert [(s['weight'], s['repetitions'], s['is_completed']) for s in second['exercises'][0]['sets']] == [('0.00', 18, False), ('65.25', 9, False)]
    finish(c, second, [('22', 16, True), ('70', 7, True)])
    third = begin(c, workout)
    assert [(s['weight'], s['repetitions']) for s in third['exercises'][0]['sets']] == [('22.00', 16), ('70.00', 7)]
    draft = payload(third)
    draft['exercises'][0]['sets'][1].update(weight='999', repetitions=1)
    saved = save(c, third, draft).json()
    assert begin(c, workout)['exercises'] == saved['exercises']  # Resume preserves edits.
    assert c.post('/api/sessions/' + third['id'] + '/discard', json={'revision': saved['revision']}).status_code == 200
    fourth = begin(c, workout)
    assert fourth['exercises'][0]['sets'][1]['weight'] == '70.00'
    assert fourth['completed_sets'] == 0
    assert c.get('/api/workouts/' + workout['id']).json() == workout
    assert c.get('/api/sessions/' + first['id']).json()['exercises'][0]['sets'][1]['weight'] == '65.25'


def test_matches_name_and_type_after_reorder_and_keeps_defaults_for_uncompleted_and_new_sets(client):
    c, _ = client
    sign_in(c)
    workout, first = start(c)
    finish(c, first, [('30', 20, True), ('99', 4, False)])
    update = editable(workout)
    update['exercises'].reverse()
    ex = update['exercises'][1]
    ex['name'] = '  SUPINO   RETO  '
    ex['sets'].reverse()
    ex['sets'].append({'set_type': 'warmup', 'target_weight': '15', 'target_repetitions': 12})
    ex['sets'].append({'set_type': 'backoff', 'target_weight': '40', 'target_repetitions': 10})
    assert c.put('/api/workouts/' + workout['id'], json=update).status_code == 200
    current = begin(c, workout)
    assert [(s['weight'], s['repetitions']) for s in current['exercises'][1]['sets']] == [('60.50', 8), ('30.00', 20), ('15.00', 12), ('40.00', 10)]
    assert not any(s['is_completed'] for ex in current['exercises'] for s in ex['sets'])


def test_does_not_reuse_other_plans_or_ambiguous_exercises(client):
    c, _ = client
    sign_in(c)
    workout, first = start(c)
    finish(c, first, [('30', 20, True), ('80', 12, True)])
    other = c.post('/api/workouts', json=PLAN).json()
    current = begin(c, other)
    assert current['exercises'][0]['sets'][1]['weight'] == '60.50'
    assert c.post('/api/sessions/' + current['id'] + '/discard', json={'revision': 0}).status_code == 200
    update = editable(workout)
    duplicate = deepcopy(update['exercises'][0])
    duplicate.pop('id')
    for item in duplicate['sets']:
        item.pop('id')
    update['exercises'].append(duplicate)
    assert c.put('/api/workouts/' + workout['id'], json=update).status_code == 200
    ambiguous = begin(c, workout)
    assert ambiguous['exercises'][0]['sets'][1]['weight'] == '60.50'
    assert ambiguous['exercises'][2]['sets'][1]['weight'] == '60.50'
