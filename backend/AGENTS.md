# Backend

FastAPI app for the fraud case board, managed with uv (Python 3.13).

## Structure

- `app/main.py` - FastAPI app. `GET /api/health`; serves the static site at `/` (mounted last so API routes win). Static dir is `static/`, overridable with `STATIC_DIR`
- `static/` - the Next.js export, copied in by the Docker build (gitignored, not present locally)
- `tests/` - pytest tests using FastAPI `TestClient`; `conftest.py` points `STATIC_DIR` at a temp dir with a stub `index.html`

## Commands

- `uv sync` - install deps
- `uv run pytest` - run tests
- `uv run uvicorn app.main:app --reload` - run locally on port 8000

In Docker the app runs from `/app/backend`; app data (SQLite) lives in `/app/data`, mounted from `data/` in the project root.
