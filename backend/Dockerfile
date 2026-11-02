FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/home/overlog/.local/bin:$PATH"
WORKDIR /app
COPY pyproject.toml requirements.lock ./
COPY app ./app
RUN pip install --no-cache-dir -r requirements.lock . && useradd --create-home overlog
COPY alembic.ini ./
COPY alembic ./alembic
RUN chown -R overlog:overlog /app
USER overlog
CMD ["sh", "-c", "python -m app.db.bootstrap && unset MIGRATION_POSTGRES_USER MIGRATION_POSTGRES_PASSWORD && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-proxy-headers --limit-concurrency 100 --timeout-keep-alive 5"]
