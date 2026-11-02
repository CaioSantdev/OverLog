from fastapi import APIRouter, Depends, Response
from sqlalchemy import update

from app.api.dependencies import CurrentUser, Database, require_same_origin_header
from app.core.config import get_settings
from app.core.rate_limit import rate_limit_login
from app.core.security import COOKIE_NAME, create_token
from app.models.user import User
from app.schemas.auth import Login, Register, UserPublic
from app.services.auth import authenticate, register_user

router = APIRouter(prefix="/auth", tags=["Autenticação"])
protected_post = [Depends(require_same_origin_header)]


def set_session(response: Response, user: User):
    response.set_cookie(
        COOKIE_NAME, create_token(user), httponly=True,
        secure=get_settings().cookie_secure, samesite="strict", path="/api",
        max_age=get_settings().jwt_expire_minutes * 60,
    )
    response.headers["Cache-Control"] = "no-store"


@router.post("/register", response_model=UserPublic, status_code=201, dependencies=protected_post)
def register(data: Register, db: Database, response: Response):
    user = register_user(db, data)
    set_session(response, user)
    return user


@router.post("/login", response_model=UserPublic, dependencies=[*protected_post, Depends(rate_limit_login)])
def login(data: Login, db: Database, response: Response):
    user = authenticate(db, data)
    set_session(response, user)
    return user


@router.get("/me", response_model=UserPublic)
def me(user: CurrentUser, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout", status_code=204, dependencies=protected_post)
def logout(user: CurrentUser, db: Database, response: Response):
    db.execute(update(User).where(User.id == user.id).values(token_version=User.token_version + 1))
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/api", secure=get_settings().cookie_secure, httponly=True, samesite="strict")
    response.headers["Cache-Control"] = "no-store"
