import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from typing import Annotated

from fastapi import FastAPI, HTTPException, Path as PathParam
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import ai, db
from app.models import BoardData

STATIC_DIR = Path(os.environ.get("STATIC_DIR", Path(__file__).resolve().parent.parent / "static"))


# Public demo: bound what a visitor can send
Username = Annotated[str, PathParam(pattern=r"^[A-Za-z0-9_-]{1,64}$")]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ai.ChatMessage] = Field(default=[], max_length=20)


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
def read_board(username: Username) -> BoardData:
    return db.get_board(username)


@app.put("/api/users/{username}/board")
def update_board(username: Username, board: BoardData) -> BoardData:
    db.save_board(username, board)
    return board


@app.post("/api/users/{username}/chat")
def chat(username: Username, request: ChatRequest) -> ai.ChatReply:
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
