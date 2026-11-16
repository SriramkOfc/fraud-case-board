# Backend

FastAPI app for the fraud case board, managed with uv (Python 3.13).

## Structure

- `app/main.py` - FastAPI app. Creates the DB on startup (lifespan). Routes: `GET /api/health`, `GET /api/users/{username}/board`, `PUT /api/users/{username}/board` (422 on invalid board). Serves the static site at `/` (mounted last so API routes win). Static dir is `static/`, overridable with `STATIC_DIR`
- `app/models.py` - Pydantic `Card`, `Column`, `BoardData`; validator enforces the five fixed stage ids in order, card ids matching keys, every card in exactly one column once, non-empty titles
- `app/seed.py` - `SEED_BOARD`: five fraud stages and 8 sample cases, given to each new user
- `app/db.py` - SQLite via stdlib `sqlite3` (no ORM). `DB_PATH` (env, default `<project>/data/app.db`, `/app/data/app.db` in Docker). `connect()` commits and always closes. `get_board` creates the user and seeds on first read; `save_board` upserts. Board stored as one JSON document per user (see `docs/DATABASE.md`)
- `static/` - the Next.js export, copied in by the Docker build (gitignored, not present locally)
- `tests/` - pytest tests using FastAPI `TestClient`; `conftest.py` points `STATIC_DIR` at a temp dir with a stub `index.html`; `client` fixture uses a fresh temp DB per test (monkeypatched `db.DB_PATH`)

## Commands

- `uv sync` - install deps
- `uv run pytest` - run tests
- `uv run uvicorn app.main:app --reload` - run locally on port 8000

In Docker the app runs from `/app/backend`; app data (SQLite) lives in `/app/data`, mounted from `data/` in the project root.
