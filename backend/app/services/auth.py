from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import DUMMY_HASH, password_hash
from app.models.user import User
from app.schemas.auth import Login, Register


def register_user(db: Session, data: Register) -> User:
    user = User(name=data.name, email=str(data.email), password_hash=password_hash.hash(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.scalar(select(User).where(User.email == str(data.email))):
            raise HTTPException(409, "Este e-mail já está cadastrado.") from None
        raise
    db.refresh(user)
    return user


def authenticate(db: Session, data: Login) -> User:
    user = db.scalar(select(User).where(User.email == str(data.email)))
    valid = password_hash.verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "E-mail ou senha inválidos.")
    return user
