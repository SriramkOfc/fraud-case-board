import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from app import audit
from app.models import BoardData
from app.seed import SEED_BOARD

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).resolve().parents[2] / "data" / "app.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Append-only audit trail: one row per change to a case, never updated or deleted
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    title TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_by_card ON events (user_id, card_id);
"""


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Commit on success, roll back on error, always close."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


def _user_id(conn: sqlite3.Connection, username: str) -> int:
    conn.execute("INSERT OR IGNORE INTO users (username) VALUES (?)", (username,))
    return conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()[0]


def get_board(username: str) -> BoardData:
    with connect() as conn:
        user_id = _user_id(conn, username)
        row = conn.execute("SELECT data FROM boards WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            return BoardData.model_validate_json(row[0])
        conn.execute(
            "INSERT INTO boards (user_id, data) VALUES (?, ?)",
            (user_id, SEED_BOARD.model_dump_json()),
        )
        return SEED_BOARD


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def save_board(username: str, board: BoardData, actor: audit.Actor = "analyst") -> None:
    """Save the board and, in the same transaction, record what changed in the audit trail."""
    with connect() as conn:
        user_id = _user_id(conn, username)
        row = conn.execute("SELECT data FROM boards WHERE user_id = ?", (user_id,)).fetchone()
        if row:  # the first save of a board is its baseline, nothing to compare with
            at = now()
            conn.executemany(
                "INSERT INTO events (user_id, card_id, title, actor, action, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    (user_id, c.cardId, c.title, actor, c.action, c.detail, at)
                    for c in audit.changes(BoardData.model_validate_json(row[0]), board)
                ],
            )
        conn.execute(
            """
            INSERT INTO boards (user_id, data) VALUES (?, ?)
            ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, board.model_dump_json()),
        )


def get_events(username: str, card_id: str) -> list[audit.Event]:
    with connect() as conn:
        user_id = _user_id(conn, username)
        rows = conn.execute(
            "SELECT card_id, title, actor, action, detail, at FROM events WHERE user_id = ? AND card_id = ? ORDER BY id DESC",
            (user_id, card_id),
        ).fetchall()
    keys = ("cardId", "title", "actor", "action", "detail", "at")
    return [audit.Event(**dict(zip(keys, row))) for row in rows]
