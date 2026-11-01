from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.workouts import router as workouts_router
from app.api.auth import router as auth_router
from app.api.health import router
from app.core.config import get_settings

app = FastAPI(title="OverLog API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_credentials=True,
    allow_headers=["*"],
)
app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(workouts_router, prefix="/api")
