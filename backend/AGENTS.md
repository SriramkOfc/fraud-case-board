# Backend

FastAPI app for the fraud case board, managed with uv (Python 3.13).

## Structure

- `app/main.py` - FastAPI app. Creates the DB on startup (lifespan). Routes: `GET /api/health`, `POST /api/ai/test` (asks the AI "What is 2+2?", returns `{"answer": ...}`), `GET /api/users/{username}/board`, `PUT /api/users/{username}/board` (422 on invalid board), `POST /api/users/{username}/chat` (`{message, history}` -> `{reply, board | null}`; saves the AI's board after `apply_timestamps`; 502 and nothing saved if the AI board is invalid or drops a case). Serves the static site at `/` (mounted last so API routes win). Static dir is `static/`, overridable with `STATIC_DIR`
- `app/ai.py` - OpenRouter client (`openai` SDK, `base_url=https://openrouter.ai/api/v1`, key from `OPENROUTER_API_KEY`), model `nvidia/nemotron-3.5-super-vl:free`. `ask(prompt)` returns the model's text. `chat(board, history, message)` sends the fraud-operations `SYSTEM_PROMPT` plus board JSON, the history and the message, and parses the structured output `ChatReply {reply, board | null}` (`chat.completions.parse`). `apply_timestamps(old, new, now)` rejects removed cases and sets `createdAt` / `updatedAt` / `archivedAt` server-side (model timestamps are ignored)
- `app/models.py` - Pydantic `Card`, `Column`, `BoardData`; validator enforces the five fixed stage ids in order, card ids matching keys, every card in exactly one column once, non-empty titles and customer names, `accountLast4` exactly 4 digits, `amount` >= 0, timestamps present; `archivedAt` optional (defaults to null)
- `app/seed.py` - `SEED_BOARD`: five fraud stages and 8 sample cases (fictional customers), given to each new user. `frontend/src/test/board.ts` is a copy; keep them in sync
- `app/db.py` - SQLite via stdlib `sqlite3` (no ORM). `DB_PATH` (env, default `<project>/data/app.db`, `/app/data/app.db` in Docker). `connect()` commits and always closes. `get_board` creates the user and seeds on first read; `save_board` upserts. Board stored as one JSON document per user (see `docs/DATABASE.md`)
- `static/` - the Next.js export, copied in by the Docker build (gitignored, not present locally)
- `tests/` - pytest tests using FastAPI `TestClient`; `conftest.py` loads the project-root `.env` (so the live AI test runs with a plain `uv run pytest`; it is skipped only if there is no key), points `STATIC_DIR` at a temp dir with a stub `index.html`; `client` fixture uses a fresh temp DB per test (monkeypatched `db.DB_PATH`)

## Commands

- `uv sync` - install deps
- `uv run pytest` - run tests
- `uv run uvicorn app.main:app --reload` - run locally on port 8000

In Docker the app runs from `/app/backend`; app data (SQLite) lives in `/app/data`, mounted from `data/` in the project root.
