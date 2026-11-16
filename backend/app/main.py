import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import db
from app.models import BoardData

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parent.parent / "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Fraud Case Board", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/users/{username}/board")
def read_board(username: str) -> BoardData:
    return db.get_board(username)


@app.put("/api/users/{username}/board")
def update_board(username: str, board: BoardData) -> BoardData:
    db.save_board(username, board)
    return board


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
