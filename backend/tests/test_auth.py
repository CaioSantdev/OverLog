from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import COOKIE_NAME, password_hash
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User

HEADERS = {'X-Requested-With': 'OverLog'}
ACCOUNT = {'name': 'Caio', 'email': 'caio@example.com', 'password': 'strong-password'}


@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    with engine.connect() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        app.dependency_overrides[get_db] = lambda: db
        with TestClient(app, headers=HEADERS) as client:
            yield client, db
        app.dependency_overrides.clear()
    engine.dispose()


def test_registration_login_me_and_logout(client):
    c, db = client
    response = c.post('/api/auth/register', json=ACCOUNT)
    assert response.status_code == 201
    assert set(response.json()) == {'id', 'name', 'email', 'created_at'}
    stored = db.scalar(select(User))
    assert stored.password_hash != ACCOUNT['password']
    assert password_hash.verify(ACCOUNT['password'], stored.password_hash)
    cookie = response.headers['set-cookie']
    assert 'HttpOnly' in cookie and 'SameSite=strict' in cookie and 'Path=/api' in cookie
    assert c.get('/api/auth/me').json()['id'] == response.json()['id']
    previous_token = c.cookies.get(COOKIE_NAME)
    assert c.post('/api/auth/logout', json={}).status_code == 204
    assert c.get('/api/auth/me').status_code == 401
    c.cookies.set(COOKIE_NAME, previous_token, path='/api')
    assert c.get('/api/auth/me').status_code == 401
    c.cookies.clear()
    login = c.post('/api/auth/login', json={'email': ' CAIO@EXAMPLE.COM ', 'password': ACCOUNT['password']})
    assert login.status_code == 200
    assert c.get('/api/auth/me').status_code == 200


def test_duplicate_normalized_email(client):
    c, _ = client
    assert c.post('/api/auth/register', json=ACCOUNT).status_code == 201
    response = c.post('/api/auth/register', json={**ACCOUNT, 'email': ' CAIO@EXAMPLE.COM '})
    assert response.status_code == 409


@pytest.mark.parametrize('data', [
    {**ACCOUNT, 'name': '  '}, {**ACCOUNT, 'email': 'invalid'},
    {**ACCOUNT, 'password': 'short'}, {**ACCOUNT, 'password': 'x' * 129},
])
def test_registration_validation(client, data):
    assert client[0].post('/api/auth/register', json=data).status_code == 422


def test_wrong_credentials_and_protected_route(client):
    c, _ = client
    assert c.get('/api/auth/me').status_code == 401
    c.post('/api/auth/register', json=ACCOUNT)
    c.cookies.clear()
    wrong = c.post('/api/auth/login', json={'email': ACCOUNT['email'], 'password': 'wrong-password'})
    missing = c.post('/api/auth/login', json={'email': 'missing@example.com', 'password': 'wrong-password'})
    assert wrong.status_code == missing.status_code == 401
    assert wrong.json() == missing.json()
    assert c.get('/api/auth/me').status_code == 401


def test_missing_csrf_header(client):
    c, _ = client
    c.headers.pop('X-Requested-With')
    for path in ('register', 'login', 'logout'):
        assert c.post('/api/auth/' + path, json=ACCOUNT).status_code == 403


@pytest.mark.parametrize('kind', ['expired', 'signature', 'missing', 'unknown', 'algorithm'])
def test_invalid_tokens(client, kind):
    c, _ = client
    user = c.post('/api/auth/register', json=ACCOUNT).json()
    now = datetime.now(timezone.utc)
    payload = {'sub': user['id'], 'ver': 0, 'iat': now, 'exp': now + timedelta(hours=1), 'iss': 'overlog', 'aud': 'overlog-web'}
    if kind == 'expired': payload['exp'] = now - timedelta(seconds=1)
    if kind == 'missing': del payload['exp']
    if kind == 'unknown': payload['sub'] = 'nonexistent'
    key = 'different-signing-key-at-least-32-characters' if kind == 'signature' else get_settings().jwt_secret_key.get_secret_value()
    token = jwt.encode(payload, key, algorithm='HS384' if kind == 'algorithm' else 'HS256')
    c.cookies.clear()
    c.cookies.set(COOKIE_NAME, token, path='/api')
    assert c.get('/api/auth/me').status_code == 401


def test_user_identity_comes_from_token(client):
    c, _ = client
    first = c.post('/api/auth/register', json=ACCOUNT).json()
    token = c.cookies.get(COOKIE_NAME)
    second = c.post('/api/auth/register', json={**ACCOUNT, 'email': 'other@example.com'}).json()
    assert first['id'] != second['id']
    assert c.get('/api/auth/me').json()['id'] == second['id']
    c.cookies.clear()
    c.cookies.set(COOKIE_NAME, token, path='/api')
    assert c.get('/api/auth/me', params={'id': second['id']}).json()['id'] == first['id']
