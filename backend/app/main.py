import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

from app.api.dashboard import router as dashboard_router
from app.api.catalog import router as catalog_router
from app.api.sessions import router as sessions_router
from app.api.workouts import router as workouts_router
from app.api.auth import router as auth_router
from app.api.health import router
from app.core.config import get_settings

from app.core.rate_limit import rate_limit_request
from app.core.request_limits import RequestLimitsMiddleware

app = FastAPI(title="OverLog API", version="0.1.0", dependencies=[Depends(rate_limit_request)],
              docs_url=None if get_settings().production else '/docs',
              redoc_url=None if get_settings().production else '/redoc',
              openapi_url=None if get_settings().production else '/openapi.json')
app.add_middleware(RequestLimitsMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_credentials=True,
    allow_headers=["Content-Type", "X-Requested-With"],
    expose_headers=["Retry-After"],
)
app.include_router(router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(workouts_router, prefix="/api")

app.include_router(sessions_router, prefix="/api")


@app.middleware("http")
async def private_responses(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    # Never echo passwords, tokens or input bodies in validation responses.
    return JSONResponse(status_code=422, content={"detail": "Confira os campos e tente novamente.",
        "fields": [".".join(str(part) for part in error["loc"]) for error in exc.errors()]})


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    logging.getLogger("overlog").error("Database operation failed: %s", type(exc).__name__)
    return JSONResponse(status_code=503, content={"detail": "Não foi possível acessar o banco. Tente novamente."},
        headers={"Cache-Control": "no-store"})
