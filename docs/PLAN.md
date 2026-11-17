# High level steps for the fraud case management project

The app is a fraud case board for a fraud analyst. Cases move through five fixed stages: Alert Triggered, Review, Investigation, Verification, Decision. Stages can be renamed but not added, removed, or reordered. Each case has a title, case notes, customer name, account (last 4 digits only), amount at risk (USD), created and last-updated dates, and can be archived.

## Status

Parts 1-7 done, plus requested additions 7b (richer cases, case windows) and 7c (archive). Next: Part 8. Latest results: pytest 25 passed (100% backend coverage), Vitest 25 passed (93.5% lines), Playwright 11 passed.

## Architecture decisions

- Single Docker container. Multi-stage build: Node stage runs `next build` with `output: "export"`; Python stage (uv) runs FastAPI with uvicorn on port 8000 and serves the exported site at `/` and the API at `/api/*`.
- Database: SQLite file (free, no server) at `data/app.db`, mounted as a Docker volume so it survives restarts. Created on startup if missing. Stdlib `sqlite3`, no ORM. Details in `docs/DATABASE.md` and `docs/schema.json`.
- Storage model: a `users` table and a `boards` table. Each user's board is stored as one JSON document matching the frontend `BoardData` shape. No per-card tables: the board is always read and written whole, which keeps the API, the AI updates and the frontend in sync with the least code.
- Ordering is array position: stage order is `columns`, case order within a stage is that column's `cardIds`. A case's stage is the column that lists it.
- Seed: the backend (`backend/app/seed.py`) is the source of truth for the sample board given to new users. `frontend/src/test/board.ts` is a copy for tests and must be kept in sync.
- Validation (Pydantic, on every save, 422 and nothing saved on failure): the five stage ids in order; every card in exactly one column, once; card ids match keys; non-empty title and customer; `accountLast4` exactly 4 digits; `amount` >= 0; `createdAt` / `updatedAt` present; `archivedAt` optional.
- Sign in (MVP): frontend-only check of the hardcoded credentials, with the signed-in username held in `sessionStorage`. API routes take the username in the path. Server-side session cookies are suggested as a follow-up at the end (Part 11).
- Saving: the frontend loads the board after sign in and saves the whole board (PUT) after every change.
- AI: OpenRouter via the `openai` Python SDK with `base_url=https://openrouter.ai/api/v1`, model `openai/gpt-oss-120b:free` (free variant, rate limited). Chat history lives in frontend state and is sent with each request (not stored in the DB).
- AI updates return the full board, which the backend validates with the same rules and saves.

## Product and UX decisions

- Case fields: `customerName`, `accountLast4`, `amount`, `createdAt`, `updatedAt`, `archivedAt`, plus `title` and `details` (case notes). Only the last 4 account digits are ever stored (common card-data practice).
- Timestamps: creating a case sets `createdAt` and `updatedAt`; editing, moving to another stage, archiving and restoring set `updatedAt`; reordering within a stage does not. Set by the frontend today; the backend will set them for AI changes (Part 9).
- Archive instead of delete: archiving sets `archivedAt` and leaves the case in its column's `cardIds`, so restore returns it to the same stage and position. Archived cases are hidden on the board. Permanent deletion exists only on the Archived page, behind a confirm step.
- Board cards are compact (title, customer, amount, masked account). Clicking a card (or Enter) opens a case window with all details and "Edit case" / "Archive case". "Add a card" opens a "New case" window for that stage. Both use one shared `Modal` (closes on Close, backdrop click or Escape).
- Header: "Archived (N)" switches to the Archived page ("Back to board" returns); "Log out".
- Colors follow the project scheme: purple for primary actions (Save, Add card, Edit case, Confirm delete), blue for amounts and links, yellow accents, navy headings, gray supporting text.

## Testing approach

- Backend: pytest with a temporary SQLite file per test, coverage 100%.
- Frontend unit: Vitest + Testing Library; board API replaced by an in-memory `fetch` stub (`src/test/mockBackend.ts`). Coverage target about 80% where sensible, excluding `src/app`, `src/test` and test files.
- E2E: Playwright against the running container (`scripts/start.sh` first). Each test resets the "user" board to the sample through the API and tests run with one worker, so running e2e resets your own "user" board.
- Playwright browsers must be installed with Node 20 (the install hangs on Node 26; see Part 2 notes).
- This plan is updated as work progresses.

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
- [x] Add card editing (title and details): Edit button opens an inline form with Save / Cancel (superseded in 7b: editing now happens in the case window)
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
- [x] In-memory board persistence: board state lifted from `KanbanBoard` to `AuthGate`, so changes survive logout / login while the app stays open (superseded in Part 7: the database now persists the board)

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

- [x] `docs/schema.json`: proposed schema as JSON (tables, columns, types, constraints, board rules, example board document)
- [x] `docs/DATABASE.md`: short explanation of the approach (SQLite file, users + boards tables, board stored as JSON, seeding, validation, trade-offs)
- [x] User sign-off (approved 2026-11-16, after DATABASE.md was reorganised by entity, ordering and data flow)

Proposed tables:
- `users(id INTEGER PK, username TEXT UNIQUE NOT NULL, created_at TEXT)`
- `boards(id INTEGER PK, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id), data TEXT NOT NULL /* JSON BoardData */, updated_at TEXT)`

Success criteria: user approves the schema.

## Part 6: Backend

- [x] On startup (FastAPI lifespan), create `data/app.db` and tables if missing
- [x] On first access for a username, create the user and seed the board with the five fraud stages and the sample fraud cases (`app/seed.py`)
- [x] Pydantic models for `BoardData` (`app/models.py`) with validation: exactly the five fixed stage ids in order, card ids match keys, every card referenced exactly once, non-empty titles
- [x] `GET /api/users/{username}/board` returns the board
- [x] `PUT /api/users/{username}/board` replaces the board after validation (upsert; creates the user if needed); 422 on invalid board
- [x] `app/db.py` with stdlib `sqlite3`, `DB_PATH` overridable by env
- [x] `backend/AGENTS.md` updated

Tests (pytest, temporary DB per test): 18 passed, backend coverage 100%
- [x] DB file (including missing parent folder) and tables are created on startup
- [x] First GET seeds the sample fraud board; second GET does not reseed
- [x] PUT then GET round-trips: rename stage, add / edit / delete / move a case, reorder within a stage
- [x] PUT before any GET creates the user
- [x] Invalid boards rejected with 422 and stored board unchanged (missing stage, reordered stages, unknown card id, duplicate card, orphan card, mismatched key, empty title)
- [x] Separate users get separate boards
- [x] Board persists across app restarts (two TestClient lifespans on the same DB)
- [x] Container: `data/app.db` created on first start, board seeded, valid PUT 200, invalid PUT 422, change survives `stop.sh` + `start.sh`

Notes:
- 52 `ResourceWarning: unclosed database` warnings on the first run. Root cause: `with sqlite3.connect(...)` only commits / rolls back, it does not close. `db.connect()` is now a context manager that commits and always closes; tests use `contextlib.closing`. Warnings gone
- The seed board then existed in both `app/seed.py` and `frontend/src/lib/kanban.ts`; resolved in Part 7 (backend seed is the source of truth, frontend keeps a test copy)

Success criteria: all backend tests pass; data persists across container restarts. Met.

## Part 7: Frontend + Backend

- [x] `frontend/src/lib/api.ts` with `getBoard` and `saveBoard`
- [x] `BoardPage` loads the board from the API after sign in ("Loading cases..." while fetching)
- [x] Every change (rename stage, add / edit / delete / move case) updates state and saves the full board via PUT (`updateBoard(updater)` passed to `KanbanBoard`)
- [x] Seed data removed from `kanban.ts`; the backend seed is the source of truth. Tests use a copy in `src/test/board.ts`
- [x] Board state removed from `AuthGate` (persistence now comes from the database)
- [x] Playwright resets the "user" board to the sample via the API before each test and runs with one worker
- [x] `frontend/AGENTS.md` updated

Tests:
- [x] Vitest: 19 passed (new `BoardPage.test.tsx` with an in-memory fetch stub: loading state then board from API, rename saves the whole board, add / edit / delete each save). Coverage 90.5% lines / 86.1% branches; `api.ts` and `BoardPage.tsx` 100%
- [x] Playwright against the container: 10 passed (new: edit a case and rename a stage, reload, both persist; logout / login keeps added, edited and moved cases)
- [x] Manual: case added in the browser, container stopped and started, case still on the board

Notes:
- First restart check reported the case missing. Root cause was the check script: it counted cards right after sign in while the page still showed "Loading cases...". The host `data/app.db` contained the case. Waiting for the board to load showed it
- Running the e2e suite resets the real "user" board to the sample cases
- Each keystroke in a stage title saves the board. Fine for local SQLite; debounce if it ever matters

Success criteria: the fraud case board is fully persistent per user. Met.

## Part 7b: Richer fraud cases (added on request)

- [x] New case fields: `customerName`, `accountLast4` (only last 4 digits stored), `amount` (USD at risk), `createdAt`, `updatedAt`
- [x] Backend `Card` model validates them (non-empty customer, 4 digits, amount >= 0, timestamps required); seed cases given fictional customers, accounts, amounts and dates (backend seed and frontend test copy generated from one source)
- [x] Frontend: shared `CaseForm` (add and edit) with visible captions; `CaseSummary` on cards and drag preview
- [x] Cards show title, customer, amount and masked account only. Click or Enter opens a case window (modal) with all details (stage, customer, account, amount, created, last updated, notes) and Edit case / Delete case (Delete later replaced by Archive in 7c). Closes on Close, backdrop or Escape. (First version expanded the card in place; changed to a window on request)
- [x] "Add a card" opens a "New case" window (shared `Modal` with the case window) instead of an inline form under the column; fields start empty
- [x] Timestamps: add sets both, edit and cross-stage move set `updatedAt` (reorder within a stage does not)
- [x] `docs/schema.json`, `docs/DATABASE.md`, frontend and backend AGENTS.md updated
- [x] Existing `data/app.db` held only the untouched old sample (checked), so it was deleted and reseeded

Tests:
- [x] pytest: 23 passed, coverage 100% (new rejections: empty customer, full account number, non-digit account, negative amount, missing createdAt; seed fields checked)
- [x] Vitest: 23 passed, coverage 92.2% lines (card shows essentials only, window opens on click / Enter with all details, closes three ways, edit and delete from the window, Escape after Save, new fields saved, edit keeps createdAt and bumps updatedAt)
- [x] Playwright: 11 passed (add with all fields, edit / delete through the case window, stage move bumps `updatedAt`, non-4-digit account blocked)
- [x] Visual check of the board, the case window and its edit form

Notes:
- Escape stopped closing the window after Save: the focused Save button unmounts, focus falls to `<body>`, and the dialog's own `onKeyDown` never fired (verified: `document.activeElement` was BODY). Fixed by listening for Escape on `window` while the window is open
- Without visible captions, filled edit fields (for example "1093" and "42300") were ambiguous because placeholders disappear; captions added
- Changing the board shape breaks existing stored boards (the backend rejects them on load). Fine while data is sample-only

Success criteria: each case shows customer, masked account, amount and dates; cases open in a window for viewing and editing; new cases are added through a window. Met.

## Part 7c: Archive instead of delete (added on request)

- [x] Requirement added to `AGENTS.md`: cases are archived, not deleted; an Archived page restores or permanently deletes them
- [x] Data: optional `archivedAt` on cards (null / missing = active). Archived cases stay in their column's `cardIds`, so restore returns them to the same stage and position. No migration needed for existing boards
- [x] Case window: "Delete case" replaced by "Archive case" (sets `archivedAt` and `updatedAt`)
- [x] Header button "Archived (N)" switches to the Archived page ("Back to board" returns): archived cases newest first with stage and archive date; Restore; Delete permanently behind an inline confirm ("This cannot be undone")
- [x] Board columns and counts exclude archived cases; counts read "1 case" / "N cases"
- [x] `docs/schema.json`, `docs/DATABASE.md`, frontend and backend AGENTS.md updated

Tests:
- [x] pytest: 25 passed (archive / restore round trip keeps the card in its column; boards without `archivedAt` load as active)
- [x] Vitest: 25 passed, coverage 93.5% lines (archive from window, hidden on board, Archived page lists with stage, restore returns to the same stage, permanent delete needs confirm and cancel keeps it)
- [x] Playwright: 11 passed (archive survives reload, restore returns to Alert Triggered, permanent delete removes the case from the API)
- [x] Existing stored board still loads after the model change (HTTP 200)
- [x] Visual check of the board header and the Archived page

Success criteria: no case can be deleted from the board directly; archived cases are hidden, listed on the Archived page, restorable to their stage, and permanently deletable only after confirming. Met.

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
- [ ] The AI works with all case fields (customer, account last 4, amount, notes) and invents only clearly fictional customer data when asked to create cases
- [ ] The AI archives (sets `archivedAt`) instead of deleting: a returned board that drops existing cases is rejected and nothing is saved
- [ ] The backend sets timestamps for AI changes by comparing with the stored board: new cases get `createdAt` = `updatedAt` = now; changed, moved, archived or restored cases get `updatedAt` = now (model-provided timestamps are not trusted)

Tests (pytest, AI client mocked):
- Reply only: board unchanged
- Reply with board update (create, edit, move multiple cases): board saved
- Invalid AI board rejected, existing board unchanged
- AI board that removes a case rejected; archiving through the AI works
- Timestamps set by the backend for new and changed cases, untouched for unchanged cases
- History is passed through to the model
- Live test (skipped when no key): asking to "move the geo-mismatch case to Investigation" moves that card

Success criteria: the AI can reliably create, edit and move one or more fraud cases via structured outputs.

## Part 10: AI chat sidebar

- [ ] Sidebar on the board page: message list, input, send button (purple), loading state
- [ ] Conversation history kept in component state and sent with each message
- [ ] When the response includes a board, the board (and the Archived count / page) updates immediately without a reload
- [ ] Styled with the project color scheme

Tests:
- Vitest with mocked API: sending a message shows reply; board update from the AI re-renders the board
- Playwright (live, skipped without key): ask the AI to create a case in Alert Triggered; card appears

Success criteria: an analyst can chat with the AI and see fraud cases created, edited and moved on the board automatically.

## Part 11: Follow-up suggestions

- [ ] Suggest replacing the frontend-only sign in with a backend login route and an HTTP-only session cookie, so API routes identify the user from the session instead of the URL

Known limitations to mention alongside (not planned work):
- Each keystroke in a stage title saves the whole board; debounce if it matters
- Two simultaneous edits to one board: last save wins
- No migration tooling: changing the board shape needs stored boards migrated or reset
- Backend seed and frontend test copy must be kept in sync by hand
- PowerShell start / stop scripts are untested (no Windows machine)
- `httpx` deprecation warning in backend tests (Starlette suggests `httpx2`; not installed because it could not be verified)
