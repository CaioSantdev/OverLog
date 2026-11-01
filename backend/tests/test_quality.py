from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from test_auth import ACCOUNT, client
from test_sessions import payload
from test_workouts import PLAN, sign_in


def test_rejects_untrusted_origin_even_with_security_header(client):
    c, _ = client
    response = c.post('/api/auth/register', json=ACCOUNT, headers={'Origin': 'https://untrusted.example'})
    assert response.status_code == 403
    assert c.post('/api/auth/register', json=ACCOUNT, headers={'Origin': get_settings().cors_origins[0]}).status_code == 201


def test_validation_does_not_echo_password(client):
    c, _ = client
    password = 'short'
    response = c.post('/api/auth/register', json={**ACCOUNT, 'password': password})
    assert response.status_code == 422
    assert password not in response.text
    assert response.json()['fields'] == ['body.password']


def test_database_failure_is_sanitized():
    class Database:
        def scalar(self, query):
            raise OperationalError('private SQL', {}, Exception('private database host'))
    app.dependency_overrides[get_db] = lambda: Database()
    try:
        response = TestClient(app).post('/api/auth/login', headers={'X-Requested-With': 'OverLog'}, json={'email': ACCOUNT['email'], 'password': ACCOUNT['password']})
        assert response.status_code == 503
        assert 'private' not in response.text
        assert response.headers['cache-control'] == 'no-store'
    finally:
        app.dependency_overrides.clear()


def test_private_responses_are_not_cached_and_history_has_bounded_queries(client):
    c, db = client
    sign_in(c)
    workout = c.post('/api/workouts', json=PLAN).json()
    for _ in range(3):
        session = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
        data = payload(session)
        data['exercises'][0]['sets'][0]['is_completed'] = True
        saved = c.put('/api/sessions/' + session['id'], json=data).json()
        c.post('/api/sessions/' + session['id'] + '/finish', json={'revision': saved['revision']})
    statements = []
    def record(connection, cursor, statement, parameters, context, many):
        statements.append(statement)
    engine = db.get_bind()
    event.listen(engine, 'before_cursor_execute', record)
    try:
        response = c.get('/api/sessions')
    finally:
        event.remove(engine, 'before_cursor_execute', record)
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert all(item['completed_sets'] == 1 for item in response.json())
    assert len(statements) <= 3
    assert response.headers['cache-control'] == 'no-store'
    assert c.get('/api/workouts').headers['cache-control'] == 'no-store'
