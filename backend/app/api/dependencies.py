from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import APIKeyCookie
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import COOKIE_NAME, decode_token
from app.db.session import get_db
from app.models.user import User

Database = Annotated[Session, Depends(get_db)]
cookie = APIKeyCookie(name=COOKIE_NAME, auto_error=False)


def require_same_origin_header(request: Request, x_requested_with: Annotated[str | None, Header()] = None):
    # A custom header forces cross-origin browsers to pass a CORS preflight.
    origin = request.headers.get("origin")
    if origin is not None and origin not in get_settings().cors_origins:
        raise HTTPException(403, "Origem da requisição não autorizada.")
    if x_requested_with != "OverLog":
        raise HTTPException(403, "Cabeçalho de segurança ausente.")


def get_current_user(db: Database, token: Annotated[str | None, Depends(cookie)]) -> User:
    unauthorized = HTTPException(401, "Sessão inválida ou expirada. Entre novamente.")
    if not token:
        raise unauthorized
    try:
        payload = decode_token(token)
        if not isinstance(payload["sub"], str) or type(payload["ver"]) is not int:
            raise unauthorized
        user = db.get(User, payload["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        raise unauthorized from None
    if user is None or user.token_version != payload["ver"]:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
