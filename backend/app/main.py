import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import ai, db
from app.models import BoardData

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parent.parent / "static"))


class ChatRequest(BaseModel):
    message: str
    history: list[ai.ChatMessage] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Fraud Case Board", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/ai/test")
def ai_test() -> dict[str, str]:
    return {"answer": ai.ask("What is 2+2?")}


@app.get("/api/users/{username}/board")
def read_board(username: str) -> BoardData:
    return db.get_board(username)


@app.put("/api/users/{username}/board")
def update_board(username: str, board: BoardData) -> BoardData:
    db.save_board(username, board)
    return board



@app.post("/api/users/{username}/chat")
def chat(username: str, request: ChatRequest) -> ai.ChatReply:
    board = db.get_board(username)
    try:
        result = ai.chat(board, request.history, request.message)
        if result.board is None:
            return result
        now = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
        saved = ai.apply_timestamps(board, result.board, now)
    except ValueError as error:  # includes pydantic ValidationError
        raise HTTPException(502, f"AI returned an invalid board: {error}") from error
    db.save_board(username, saved)
    return ai.ChatReply(reply=result.reply, board=saved)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
