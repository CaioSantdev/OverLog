"""Atomic counters shared by every API process through the application database."""
import hashlib
import hmac
import math
import secrets
import time

from fastapi import HTTPException, Request
from jwt import InvalidTokenError
from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.api.dependencies import Database
from app.core.config import get_settings
from app.core.security import COOKIE_NAME, decode_token
from app.models.rate_limit import RateLimitBucket
from app.schemas.auth import Login


def consume(db, identity: str, limit: int, seconds: int):
    now = int(time.time())
    # Fixed window beginning at the first hit; upsert serializes concurrent increments.
    key = hmac.new(get_settings().jwt_secret_key.get_secret_value().encode(), identity.encode(), hashlib.sha256).hexdigest()
    insert = sqlite_insert if db.get_bind().dialect.name == 'sqlite' else pg_insert
    statement = insert(RateLimitBucket).values(key=key, hits=1, expires_at=now + seconds)
    expired = RateLimitBucket.expires_at <= now
    statement = statement.on_conflict_do_update(index_elements=['key'], set_={
        'hits': case((expired, 1), else_=RateLimitBucket.hits + 1),
        'expires_at': case((expired, now + seconds), else_=RateLimitBucket.expires_at),
    }).returning(RateLimitBucket.hits, RateLimitBucket.expires_at)
    hits, expires = db.execute(statement).one()
    # Bound cleanup work and keep expired keys from growing indefinitely.
    if secrets.randbelow(100) == 0:
        stale = select(RateLimitBucket.key).where(RateLimitBucket.expires_at <= now).limit(500)
        db.execute(delete(RateLimitBucket).where(RateLimitBucket.key.in_(stale)))
    db.commit()  # Blocked attempts count even though the endpoint transaction never runs.
    if hits > limit:
        raise HTTPException(429, 'Muitas requisições. Aguarde antes de tentar novamente.',
                            headers={'Retry-After': str(max(1, math.ceil(expires - now)))})


def rate_limit_request(request: Request, db: Database):
    path = request.url.path.rstrip('/')
    if not path.startswith('/api/') or path == '/api/health' or request.method == 'OPTIONS':
        return
    settings = get_settings()
    # Only the ASGI peer is trusted. Forwarded headers supplied by clients cannot rotate keys.
    peer = request.client.host if request.client else 'unknown'
    if path in {'/api/auth/login', '/api/auth/register'} and request.method == 'POST':
        consume(db, f'auth:{peer}', settings.rate_limit_auth, 60)
        if path.endswith('/register'):
            consume(db, f'register:{peer}', settings.rate_limit_register, 600)
        return
    consume(db, f'api:{peer}', settings.rate_limit_ip, 60)
    token = request.cookies.get(COOKIE_NAME)
    if token:
        try:
            subject = decode_token(token)['sub']
        except (InvalidTokenError, KeyError, ValueError):
            return
        if isinstance(subject, str):
            writing = request.method not in {'GET', 'HEAD'}
            consume(db, f'user:{"write" if writing else "read"}:{subject}',
                    settings.rate_limit_write if writing else settings.rate_limit_read, 60)


def rate_limit_login(data: Login, db: Database):
    consume(db, f'login-account:{data.email}', get_settings().rate_limit_login_account, 900)
