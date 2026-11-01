from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.models.user import User

password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummy-password-for-timing")
COOKIE_NAME = "overlog_session"


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user.id, "ver": user.token_version, "iat": now,
         "exp": now + timedelta(minutes=get_settings().jwt_expire_minutes),
         "iss": "overlog", "aud": "overlog-web"},
        get_settings().jwt_secret_key.get_secret_value(), algorithm="HS256",
    )


def decode_token(token: str) -> dict:
    return jwt.decode(
        token, get_settings().jwt_secret_key.get_secret_value(),
        algorithms=["HS256"], issuer="overlog", audience="overlog-web",
        options={"require": ["sub", "ver", "iat", "exp", "iss", "aud"]},
    )
