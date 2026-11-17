import os
import tempfile
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

static_dir = Path(tempfile.mkdtemp())
(static_dir / "index.html").write_text("<h1>Fraud Case Board</h1>")
os.environ["STATIC_DIR"] = str(static_dir)

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "nested" / "app.db"
    monkeypatch.setattr(db, "DB_PATH", path)
    return path


@pytest.fixture
def client(db_path):
    with TestClient(app) as test_client:
        yield test_client
