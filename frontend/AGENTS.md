# Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS 4 single-page fraud case board. Built as a static export (`output: "export"` in `next.config.ts`, output in `out/`) and served by the FastAPI backend at `/` inside Docker. Board state lives in memory in `AuthGate`: it survives logout / login but resets on page reload (database persistence comes in Part 7). Sign in is frontend-only (MVP). No persistence or AI yet.

## Structure

- `src/app/page.tsx` - renders `AuthGate`
- `src/components/AuthGate.tsx` - reads the session with `useSyncExternalStore` (undefined during static render, so nothing renders until the browser reads it); owns the board state; shows `LoginForm` when signed out, `KanbanBoard` when signed in
- `src/components/LoginForm.tsx` - username / password form, error message on wrong credentials
- `src/lib/auth.ts` - hardcoded credential check ("user" / "password"), session user in `sessionStorage` (`fraud-board-user`) with a small subscribe / notify store
- `src/app/layout.tsx` - fonts (Space Grotesk display, Manrope body) and metadata ("Fraud Case Board")
- `src/app/globals.css` - color scheme as CSS variables (`--accent-yellow`, `--primary-blue`, `--secondary-purple`, `--navy-dark`, `--gray-text`)
- `src/lib/kanban.ts` - types (`Card`, `Column`, `BoardData`), seed data `initialData` (five fraud stages: Alert Triggered, Review, Investigation, Verification, Decision, with 8 sample cases), `moveCard` (reorder / move between columns), `createId`
- `src/components/KanbanBoard.tsx` - receives `board` / `setBoard` props; drag and drop via `@dnd-kit` (`DndContext`, `DragOverlay`); handlers for rename column, add / edit / delete card, move card; header with stage pills and Log out button (`onLogout` prop)
- `src/components/KanbanColumn.tsx` - droppable column with inline editable title, card count, sortable card list, `NewCardForm`
- `src/components/KanbanCard.tsx` - sortable card showing title and details, Edit (inline form, Save / Cancel) and Remove buttons. Drag attributes and listeners are not applied while editing (dnd-kit's `aria-disabled` would otherwise disable the form fields)
- `src/components/KanbanCardPreview.tsx` - card shown in the drag overlay
- `src/components/NewCardForm.tsx` - toggleable form to add a card (title required, details optional)

## Data shape

```ts
type BoardData = {
  columns: { id: string; title: string; cardIds: string[] }[];
  cards: Record<string, { id: string; title: string; details: string }>;
};
```

## Tests

- Unit (Vitest + Testing Library, jsdom): `src/lib/kanban.test.ts`, `src/components/KanbanBoard.test.tsx`, `src/components/AuthGate.test.tsx` - `npm run test:unit`
- E2E (Playwright, Chromium) against the Docker container at http://127.0.0.1:8000: `tests/kanban.spec.ts` (signs in via `beforeEach`), `tests/auth.spec.ts` - start it with `scripts/start.sh`, then `npm run test:e2e`
- Coverage: `npx vitest run --coverage` (excludes `src/app`, `src/test` and test files). Aim for about 80% where sensible

Test ids: columns `column-<columnId>`, cards `card-<cardId>`.

Installing Playwright browsers hangs on Node 26; run `npx playwright install chromium` with Node 20.

Next.js renders its own hidden `role="alert"` route announcer, so locate error messages by text, not by the alert role.
