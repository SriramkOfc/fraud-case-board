import os
from contextlib import asynccontextmanager
from pathlib import Path

from typing import Annotated

from fastapi import FastAPI, HTTPException, Path as PathParam
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import ai, audit, db
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
def update_board(username: Username, board: BoardData, actor: audit.Actor = "analyst") -> BoardData:
    """Save the board. actor=ai when the analyst applies changes proposed by the AI."""
    db.save_board(username, board, actor)
    return board


@app.get("/api/users/{username}/cards/{card_id}/history")
def card_history(username: Username, card_id: str) -> list[audit.Event]:
    return db.get_events(username, card_id)


@app.post("/api/users/{username}/chat")
def chat(username: Username, request: ChatRequest) -> ai.Proposal:
    """Ask the AI. Board changes come back as a proposal; nothing is saved until the analyst applies it."""
    board = db.get_board(username)
    try:
        result = ai.chat(board, request.history, request.message)
        if result.board is None:
            return ai.Proposal(reply=result.reply, board=None, changes=[])
        proposed = ai.apply_timestamps(board, result.board, db.now())
    except ValueError as error:  # includes pydantic ValidationError
        raise HTTPException(502, f"AI returned an invalid board: {error}") from error
    changes = audit.changes(board, proposed)
    return ai.Proposal(reply=result.reply, board=proposed if changes else None, changes=changes)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
