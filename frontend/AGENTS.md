# Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS 4 single-page fraud case board. Built as a static export (`output: "export"` in `next.config.ts`, output in `out/`) and served by the FastAPI backend at `/` inside Docker. After sign in the board is loaded from the backend API and every change saves the whole board back (`PUT`), so it persists across reloads, logout / login and container restarts. Sign in is frontend-only (MVP). An AI assistant panel can create, edit, move and archive cases through the backend chat route.

## Structure

- `src/app/page.tsx` - renders `AuthGate`
- `src/components/AuthGate.tsx` - reads the session with `useSyncExternalStore` (undefined during static render, so nothing renders until the browser reads it); shows `LoginForm` when signed out, `BoardPage` when signed in
- `src/components/BoardPage.tsx` - loads the board for the user ("Loading cases..." until it arrives), holds it in state, and passes `updateBoard(updater)` to `KanbanBoard`; each update sets state and calls `saveBoard`. Renders `ChatSidebar`, whose AI boards only set state (the backend already saved them)
- `src/components/ChatSidebar.tsx` - AI chat panel. A fixed purple "AI assistant" button opens it; it slides over the right edge (not beside the board, which keeps the five stages full width) and stays mounted when closed so the conversation is kept. Messages and history in component state, history sent with each message; "Thinking..." while waiting, Send disabled; error line on failure; calls `onBoard` when the reply has a board
- `src/lib/api.ts` - `getBoard(username)`, `saveBoard(username, board)` against `/api/users/{username}/board`; `sendChat(username, message, history)` posts to `/api/users/{username}/chat` and throws on a non-OK status
- `src/components/LoginForm.tsx` - username / password form, error message on wrong credentials
- `src/lib/auth.ts` - hardcoded credential check ("user" / "password"), session user in `sessionStorage` (`fraud-board-user`) with a small subscribe / notify store
- `src/app/layout.tsx` - fonts (Space Grotesk display, Manrope body) and metadata ("Fraud Case Board")
- `src/app/globals.css` - color scheme as CSS variables (`--accent-yellow`, `--primary-blue`, `--secondary-purple`, `--navy-dark`, `--gray-text`)
- `src/lib/kanban.ts` - types (`CaseInput`, `Card`, `Column`, `BoardData`), `formatAmount` (USD), `formatDate` (en-AU, local time), `moveCard` (reorder / move between columns), `createId`. The seed board lives in the backend (`backend/app/seed.py`)
- `src/test/board.ts` - `sampleBoard`, a copy of the backend seed for tests; `src/test/mockBackend.ts` - in-memory `fetch` stub for the board API; pass a handler to answer chat requests
- `src/components/KanbanBoard.tsx` - receives `board` / `updateBoard` props; drag and drop via `@dnd-kit` (`DndContext`, `DragOverlay`); holds `openCardId` for the case window and `showArchive` for the Archived page; columns get only non-archived cards; handlers for rename column, add / edit / delete card, move card (add sets both timestamps; edit and cross-stage moves set `updatedAt`); header with stage pills and Log out button (`onLogout` prop)
- `src/components/KanbanColumn.tsx` - droppable column with inline editable title, card count, sortable card list, `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable compact card (`CaseSummary`, no buttons). Click or Enter calls `onOpen(cardId)`; dnd-kit swallows the click that ends a drag, so dropping does not open it
- `src/components/CaseSummary.tsx` - compact case content (title, customer, amount, masked account), shared by the card and the drag preview
- `src/components/Modal.tsx` - shared window (`role="dialog"`, dimmed backdrop). Closes on Close, backdrop click or Escape (listener on `window`, because focus drops to `<body>` when a form unmounts after submit)
- `src/components/CaseDialog.tsx` - `Modal` for one case: stage, customer, account, amount, created / last updated, notes; "Edit case" swaps in `CaseForm`, "Archive case" archives it. Rendered by `KanbanBoard` outside the cards so its events never reach the drag listeners
- `src/components/ArchiveView.tsx` - Archived page (shown instead of the board via the header "Archived (N)" / "Back to board" button): archived cases newest first with stage and archive date; Restore, or Delete permanently with an inline confirm step
- `src/components/CaseForm.tsx` - shared add / edit form (`initial` omitted for a new case, so fields start empty): title, customer, account last 4 (`pattern=\d{4}`), amount (USD), details, each with a visible caption
- `src/components/KanbanCardPreview.tsx` - card shown in the drag overlay
- `src/components/NewCardForm.tsx` - "Add a card" button that opens a "New case" `Modal` (eyebrow shows the stage) with `CaseForm`

## Data shape

```ts
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards: Record<string, {
    id: string; title: string; details: string;
    customerName: string; accountLast4: string; amount: number;
    createdAt: string; updatedAt: string; // ISO 8601
    archivedAt?: string | null; // archived cases stay in cardIds, hidden on the board
  }>;
};
```

## Tests

- Unit (Vitest + Testing Library, jsdom): `src/lib/kanban.test.ts`, `src/components/KanbanBoard.test.tsx`, `src/components/AuthGate.test.tsx`, `src/components/BoardPage.test.tsx`, `src/components/ChatSidebar.test.tsx` - `npm run test:unit`
- E2E (Playwright, Chromium) against the Docker container at http://127.0.0.1:8000: `tests/kanban.spec.ts` (signs in via `beforeEach`), `tests/auth.spec.ts`, `tests/chat.spec.ts` (live: calls the real AI through the container). Each test resets the "user" board to `sampleBoard` via the API (`tests/helpers.ts`), and tests run with one worker. Running e2e therefore resets your own "user" board. Start the container with `scripts/start.sh`, then `npm run test:e2e`
- Coverage: `npx vitest run --coverage` (excludes `src/app`, `src/test` and test files). Aim for about 80% where sensible

Test ids: columns `column-<columnId>`, cards `card-<cardId>`.

Installing Playwright browsers hangs on Node 26; run `npx playwright install chromium` with Node 20.

Next.js renders its own hidden `role="alert"` route announcer, so locate error messages by text, not by the alert role.
