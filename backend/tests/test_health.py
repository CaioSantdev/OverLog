from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.db.session import get_db
from app.main import app


def test_health_connected():
    class Database:
        def execute(self, statement):
            assert str(statement) == "SELECT 1"

    app.dependency_overrides[get_db] = lambda: Database()
    try:
        response = TestClient(app).get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "database": "connected"}
    finally:
        app.dependency_overrides.clear()


def test_health_unavailable():
    class Database:
        def execute(self, statement):
            raise OperationalError("SELECT 1", {}, Exception("database offline"))

    app.dependency_overrides[get_db] = lambda: Database()
    try:
        response = TestClient(app).get("/api/health")
        assert response.status_code == 503
        assert response.json() == {"status": "unavailable", "database": "disconnected"}
    finally:
        app.dependency_overrides.clear()
