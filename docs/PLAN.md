# High level steps for the fraud case management project

The app is a fraud case board for a fraud analyst. Cases move through five fixed stages: Alert Triggered, Review, Investigation, Verification, Decision. Stages can be renamed but not added, removed, or reordered. Each case card has a title and details only.

## Architecture decisions

- Single Docker container. Multi-stage build: Node stage runs `next build` with `output: "export"`; Python stage (uv) runs FastAPI with uvicorn on port 8000 and serves the exported site at `/` and the API at `/api/*`.
- Database: SQLite file (free, no server) at `data/app.db`, mounted as a Docker volume so it survives restarts. Created on startup if missing.
- Storage model: a `users` table and a `boards` table. Each user's board is stored as one JSON document matching the frontend `BoardData` shape. No per-card tables: the board is always read and written whole, which keeps the API, the AI updates and the frontend in sync with the least code.
- Sign in (MVP): frontend-only check of the hardcoded credentials, with the signed-in username held in `sessionStorage`. API routes take the username in the path. Server-side session cookies are suggested as a follow-up at the end (Part 11).
- AI: OpenRouter via the `openai` Python SDK with `base_url=https://openrouter.ai/api/v1`, model `openai/gpt-oss-120b:free` (free variant, rate limited). Chat history lives in frontend state and is sent with each request (not stored in the DB).
- AI updates return the full board, which the backend validates (same five stage ids, every card id referenced exactly once) and saves.

## Part 1: Plan

- [x] Enrich this document with substeps, tests and success criteria for each part
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [x] User reviews and approves this plan (approved 2026-11-16; free model variant chosen)

Success criteria: user approves the plan.

## Part 2: Scaffolding

- [x] `backend/` FastAPI app managed with uv (`pyproject.toml`, `uv.lock`), entry `backend/app/main.py`
- [x] `GET /api/health` returns `{"status": "ok"}`
- [x] Temporary `backend/static/index.html` "hello world" page served at `/` that calls `/api/health` and shows the result
- [x] `Dockerfile` at project root (`ghcr.io/astral-sh/uv:python3.13-bookworm-slim`), `.dockerignore`
- [x] `scripts/start.sh`, `scripts/stop.sh` (Mac/Linux) and `scripts/start.ps1`, `scripts/stop.ps1` (Windows): build image, run container `fraud-board` on port 8000 with `--env-file .env` and `data/` mounted at `/app/data`; stop removes the container
- [x] Update `backend/AGENTS.md` and `scripts/AGENTS.md`
- [x] `data/` added to `.gitignore`

Tests:
- [x] pytest: health route returns 200 and expected JSON; `/` serves the index page (2 passed)
- [x] Manual: `scripts/start.sh` builds and runs; `curl /api/health` returns ok and `/` returns the page; `scripts/stop.sh` removes the container
- [x] Browser: headless Chromium loads http://localhost:8000, page heading shows and the in-page `/api/health` call renders "ok"

Notes:
- pytest needed `pythonpath = ["."]` in `pyproject.toml` so `app` is importable from `tests/`
- Starlette warns that `httpx` with `TestClient` is deprecated in favour of `httpx2`; kept `httpx` for now (warning only)
- PowerShell scripts written but not run (no Windows machine available)
- Playwright 1.58 `playwright install` hangs at the unzip step under Node 26 (zip verified valid with `unzip -t`, extractor idle at 0% CPU). Installing with Node 20 (`~/.nvm/versions/node/v20.20.2`) completed. Running tests under Node 26 is fine; only the browser install is affected

Success criteria: container starts from a clean checkout with one command, hello world page and API call work, stop script cleans up. Met.

## Part 3: Add in Frontend

- [x] Set `output: "export"` in `next.config.ts`
- [x] Dockerfile gets a Node build stage (`node:24-slim`, `npm ci && npm run build`); exported `out/` copied to `/app/backend/static` and served by FastAPI at `/` (hello world page removed; `backend/static/` gitignored)
- [x] `STATIC_DIR` env var (default `backend/static`) so backend tests use a temp dir with a stub `index.html` (`backend/tests/conftest.py`)
- [x] Add card editing (title and details): Edit button opens an inline form with Save / Cancel
- [x] Fix test-global types so `tsc --noEmit` passes
- [x] Point Playwright `baseURL` at the container (http://127.0.0.1:8000); removed the `next dev` webServer
- [x] Coverage excludes `src/app`, `src/test` and test files; target about 80% where sensible
- [x] Frontend README and AGENTS.md updated

Tests:
- [x] Vitest: 10 passed (edit save, edit cancel, empty title not saved, add form cancel added). Coverage 89.7% lines / 81.6% branches
- [x] Playwright against the container: 5 passed (board loads with "Fraud Case Board" and five stages, add, edit, delete, drag between stages)
- [x] pytest: 2 passed (`/api/health`, `/` serves index.html)
- [x] `tsc --noEmit` clean

Notes:
- `tsc` failures were because `src/test/vitest.d.ts` referenced `vitest` instead of `vitest/globals` (config uses `globals: true`)
- First edit e2e failed: `useSortable({ disabled: true })` sets `aria-disabled="true"` on the card (role=button), which makes the nested form fields count as disabled (Playwright refused to fill them; screen readers would announce them as disabled). Fix: do not spread dnd-kit attributes / listeners while editing
- Unit coverage does not reach the drag handlers or `KanbanCardPreview` (needs real pointer events); the drag e2e test covers them

Success criteria: fraud case board is served from the container at `/`, all unit and e2e tests pass. Met.

## Part 4: Add in a fake user sign in experience

- [x] Login screen at `/` (username, password) shown when not signed in; credentials checked against "user" / "password" in the frontend (`src/lib/auth.ts`)
- [x] Signed-in username stored in `sessionStorage`; board shown when signed in (`AuthGate`)
- [x] Logout button in the board header clears the session and returns to the login screen
- [x] Error message on wrong credentials
- [x] In-memory board persistence: board state lifted from `KanbanBoard` to `AuthGate`, so changes survive logout / login while the app stays open (a page reload still resets until Part 7)

Tests:
- [x] Vitest: 16 passed (new `AuthGate.test.tsx`: login form shown when signed out, valid login, invalid login message, session kept, logout, board changes kept after logout / login). Coverage 91.0% lines / 85.0% branches
- [x] Playwright: 9 passed (new `auth.spec.ts`: board hidden until sign in, wrong password rejected, sign in survives reload, logout returns to login, added, edited and moved cases kept after logout / login; board tests sign in via `beforeEach`)
- [x] `tsc --noEmit` and `eslint src` clean

Notes:
- First version read `sessionStorage` in a `useEffect` and set state; eslint `react-hooks/set-state-in-effect` flagged it. Replaced with `useSyncExternalStore` (server snapshot `undefined` for the static export render), which also removed the extra "checked" state
- The only uncovered unit lines are the static-render branch in `AuthGate` (not reachable in jsdom)
- Next.js adds a hidden `role="alert"` route announcer, so the e2e test finds the error message by text
- dnd-kit swallows clicks on the document for 50ms after a drop (so the drop is not treated as a click). Automated tests that click right after a drag must wait about 100ms; not noticeable for real users

Success criteria: board is not visible until signed in with "user" / "password"; logout works; board changes survive logout / login in memory. Met.

## Part 5: Database modeling

- [ ] `docs/schema.json`: proposed schema as JSON (tables, columns, types, constraints, example board document)
- [ ] `docs/DATABASE.md`: short explanation of the approach (SQLite file, users + boards tables, board stored as JSON, seeding, validation)
- [ ] User sign-off

Proposed tables:
- `users(id INTEGER PK, username TEXT UNIQUE NOT NULL, created_at TEXT)`
- `boards(id INTEGER PK, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id), data TEXT NOT NULL /* JSON BoardData */, updated_at TEXT)`

Success criteria: user approves the schema.

## Part 6: Backend

- [ ] On startup, create `data/app.db` and tables if missing
- [ ] On first access for a username, create the user and seed the board with the five fraud stages and the sample fraud cases
- [ ] Pydantic models for `BoardData` (columns, cards) with validation: exactly the five fixed stage ids in order, every card referenced exactly once
- [ ] `GET /api/users/{username}/board` returns the board
- [ ] `PUT /api/users/{username}/board` replaces the board after validation; 422 on invalid board

Tests (pytest, temporary DB per test):
- DB file and tables are created when missing
- First GET seeds the sample fraud board
- PUT then GET round-trips: rename stage, add / edit / delete / move a case
- Invalid boards rejected (missing stage, unknown card id, duplicate card)
- Separate users get separate boards

Success criteria: all backend tests pass; data persists across container restarts.

## Part 7: Frontend + Backend

- [ ] `frontend/src/lib/api.ts` with `getBoard` and `saveBoard`
- [ ] Board loads from the API after sign in (loading state while fetching)
- [ ] Every change (rename stage, add / edit / delete / move case) saves the full board via PUT
- [ ] Sample data in `kanban.ts` no longer used as the live source of truth (seed lives in the backend)

Tests:
- Vitest with mocked fetch: board renders from API data; changes call `saveBoard` with the updated board
- Playwright against the container: make changes, reload the page, changes persist; restart container, changes still persist

Success criteria: the fraud case board is fully persistent per user.

## Part 8: AI connectivity

- [ ] Add `openai` SDK; client configured for OpenRouter using `OPENROUTER_API_KEY` from `.env`
- [ ] `POST /api/ai/test` sends "What is 2+2?" and returns the answer

Tests:
- pytest with the client mocked: route returns model text
- Live test (skipped when no key): answer contains "4"

Success criteria: a real OpenRouter call succeeds from inside the container.

## Part 9: AI with the board (structured outputs)

- [ ] `POST /api/users/{username}/chat` with `{ message, history }`
- [ ] Prompt includes a fraud-operations system prompt, the current board JSON, the history, and the user message
- [ ] Fraud-aware system prompt: the AI acts as a fraud operations assistant; it knows what each stage means and the normal work in it (alert triage and holds; review for false positives and duplicates; investigation of devices, IPs, linked accounts and fund flow; customer and KYC verification; decision outcomes such as block and reissue, chargeback, SAR filing, release hold, rule tuning); it uses fraud terminology, suggests sensible next steps, writes case details as concise analyst notes, and does not invent real customer personal data
- [ ] Structured output schema: `{ "reply": string, "board": BoardData | null }`
- [ ] If `board` is returned, validate with the Part 6 rules and save; response returns `reply` and the saved board (or null)

Tests (pytest, AI client mocked):
- Reply only: board unchanged
- Reply with board update (create, edit, move multiple cases): board saved
- Invalid AI board rejected, existing board unchanged
- History is passed through to the model
- Live test (skipped when no key): asking to "move the geo-mismatch case to Investigation" moves that card

Success criteria: the AI can reliably create, edit and move one or more fraud cases via structured outputs.

## Part 10: AI chat sidebar

- [ ] Sidebar on the board page: message list, input, send button (purple), loading state
- [ ] Conversation history kept in component state and sent with each message
- [ ] When the response includes a board, the board updates immediately without a reload
- [ ] Styled with the project color scheme

Tests:
- Vitest with mocked API: sending a message shows reply; board update from the AI re-renders the board
- Playwright (live, skipped without key): ask the AI to create a case in Alert Triggered; card appears

Success criteria: an analyst can chat with the AI and see fraud cases created, edited and moved on the board automatically.

## Part 11: Follow-up suggestion

- [ ] Suggest replacing the frontend-only sign in with a backend login route and an HTTP-only session cookie, so API routes identify the user from the session instead of the URL
