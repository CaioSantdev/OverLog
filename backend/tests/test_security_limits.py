import asyncio
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.rate_limit import consume
from app.core.request_limits import RequestLimitsMiddleware
from app.models.rate_limit import RateLimitBucket
from test_auth import ACCOUNT, client
from test_workouts import PLAN, sign_in


def test_auth_limit_survives_session_and_rejects_spoofed_forwarded_headers(client, monkeypatch):
    c, db = client
    monkeypatch.setattr(get_settings(), 'rate_limit_auth', 2)
    for index in range(2):
        assert c.post('/api/auth/login', json={'email': 'absent@example.com', 'password': 'bad-password'}, headers={'X-Forwarded-For': str(index)}).status_code == 401
    response = c.post('/api/auth/login', json=ACCOUNT, headers={'X-Forwarded-For': 'new-address'})
    assert response.status_code == 429
    assert 1 <= int(response.headers['retry-after']) <= 60
    assert response.headers['cache-control'] == 'no-store'
    assert 'absent@example.com' not in str(db.scalars(select(RateLimitBucket.key)).all())
    assert c.get('/api/health').status_code == 200


def test_login_account_limit_normalizes_email_and_does_not_block_other_accounts(client, monkeypatch):
    c, _ = client
    monkeypatch.setattr(get_settings(), 'rate_limit_login_account', 1)
    data = {'email': ' CAIO@EXAMPLE.COM ', 'password': 'bad-password'}
    assert c.post('/api/auth/login', json=data).status_code == 401
    assert c.post('/api/auth/login', json={**data, 'email': 'caio@example.com'}).status_code == 429
    assert c.post('/api/auth/login', json={**data, 'email': 'other@example.com'}).status_code == 401


def test_user_read_write_limits_are_separate_and_have_expiry(client, monkeypatch):
    c, db = client
    sign_in(c)
    monkeypatch.setattr(get_settings(), 'rate_limit_read', 1)
    monkeypatch.setattr(get_settings(), 'rate_limit_write', 1)
    assert c.get('/api/workouts').status_code == 200
    assert c.get('/api/workouts').status_code == 429
    assert c.post('/api/workouts', json=PLAN).status_code == 201
    assert c.post('/api/workouts', json=PLAN).status_code == 429
    monkeypatch.setattr('app.core.rate_limit.time.time', lambda: 2000000000)
    consume(db, 'expiry-test', 1, 60)
    with pytest.raises(HTTPException) as error:
        consume(db, 'expiry-test', 1, 60)
    assert error.value.status_code == 429
    monkeypatch.setattr('app.core.rate_limit.time.time', lambda: 2000000060)
    consume(db, 'expiry-test', 1, 60)


def test_atomic_limit_counts_concurrent_connections(tmp_path):
    engine = create_engine('sqlite:///' + str(tmp_path / 'limits.db'), connect_args={'timeout': 10})
    RateLimitBucket.__table__.create(engine)
    def attempt(_):
        with Session(engine) as db:
            try:
                consume(db, 'concurrent', 5, 60)
                return True
            except HTTPException:
                return False
    with ThreadPoolExecutor(max_workers=8) as executor:
        assert sum(executor.map(attempt, range(20))) == 5
    engine.dispose()


def test_size_limit_rejects_large_json_before_validation(client):
    c, _ = client
    response = c.post('/api/auth/register', content=b'x' * (2 * 1024 * 1024 + 1))
    assert response.status_code == 413
    assert response.headers['x-frame-options'] == 'DENY'
    assert response.headers['cache-control'] == 'no-store'


def test_chunked_size_limit_and_timeout_without_content_length():
    called = False
    async def endpoint(scope, receive, send):
        nonlocal called
        called = True
    middleware = RequestLimitsMiddleware(endpoint, max_bytes=4, timeout=0.01)
    async def run(slow):
        sent = []
        chunks = iter([b'abc', b'def'])
        async def receive():
            if slow:
                await asyncio.sleep(0.1)
            return {'type': 'http.request', 'body': next(chunks), 'more_body': True}
        async def send(message):
            sent.append(message)
        await middleware({'type': 'http', 'headers': []}, receive, send)
        return sent[0]['status']
    assert asyncio.run(run(False)) == 413
    assert asyncio.run(run(True)) == 408
    assert not called


def test_production_requires_secure_settings():
    base = {'jwt_secret_key': 'x' * 48, 'production': True, 'cookie_secure': True,
            'postgres_password': 'a-long-exclusive-password', 'cors_origins': ['https://overlog.example']}
    assert Settings(_env_file=None, **base).production
    for override in ({'cookie_secure': False}, {'postgres_password': 'local-development-only'}, {'cors_origins': ['http://overlog.example']}, {'cors_origins': ['https://*.example']}):
        with pytest.raises(ValueError):
            Settings(_env_file=None, **{**base, **override})


def test_registration_has_an_independent_limit(client, monkeypatch):
    c, _ = client
    monkeypatch.setattr(get_settings(), 'rate_limit_register', 1)
    assert c.post('/api/auth/register', json=ACCOUNT).status_code == 201
    response = c.post('/api/auth/register', json={**ACCOUNT, 'email': 'another@example.com'})
    assert response.status_code == 429
    assert 1 <= int(response.headers['retry-after']) <= 600
    assert c.post('/api/auth/login', json=ACCOUNT).status_code == 200
