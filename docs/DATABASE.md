# Database

Full schema: [schema.json](schema.json)

## 1. Overview

The app stores data in one SQLite file. Users and boards are SQL tables. Columns (fraud stages) and cards (fraud cases) live inside each board as one JSON document.

```
SQLite file: data/app.db
|
+-- users            (SQL table, one row per analyst)
|     |
|     | 1 : 1
|     v
+-- boards           (SQL table, one row per user)
      |
      +-- data       (JSON document)
            +-- columns   ordered list of the 5 fraud stages
            |     +-- cardIds   ordered list of card ids in that stage
            +-- cards     map of card id -> fraud case
```

| Item | Where it lives | Count |
|---|---|---|
| User | `users` table row | many (MVP signs in as one: "user") |
| Board | `boards` table row | exactly 1 per user |
| Column (stage) | `boards.data.columns[]` | exactly 5 per board, fixed |
| Card (case) | `boards.data.cards{}` | any number per board |

## 2. Storage

| | |
|---|---|
| Engine | SQLite, via Python's built-in `sqlite3` (no ORM, no server, free) |
| File | `data/app.db` locally; `/app/data/app.db` in the container, mounted from `data/` so it survives restarts |
| Creation | On backend startup, `CREATE TABLE IF NOT EXISTS` for both tables. A missing file is created automatically |

## 3. Entities

### Users

One row per analyst. Exists so the database supports multiple users later, even though the MVP has one hardcoded login.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | |
| `username` | TEXT NOT NULL UNIQUE | e.g. `user` |
| `created_at` | TEXT | defaults to current timestamp |

### Boards

One row per user, holding that user's whole fraud case board.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | |
| `user_id` | INTEGER NOT NULL UNIQUE | references `users(id)`, deleted with the user. UNIQUE enforces one board per user |
| `data` | TEXT NOT NULL | the board as JSON (columns + cards, below) |
| `updated_at` | TEXT | set on every save |

### Columns (fraud stages)

Stored in `data.columns`, an array of five objects.

| Field | Type | Notes |
|---|---|---|
| `id` | string | fixed, never changes |
| `title` | string | display name, can be renamed |
| `cardIds` | string[] | ids of the cases in this stage, top to bottom |

The five stages are fixed: they can be renamed but not added, removed or reordered.

| Position | `id` | Default title |
|---|---|---|
| 1 | `col-alert` | Alert Triggered |
| 2 | `col-review` | Review |
| 3 | `col-investigation` | Investigation |
| 4 | `col-verification` | Verification |
| 5 | `col-decision` | Decision |

### Cards (fraud cases)

Stored in `data.cards`, an object keyed by card id.

| Field | Type | Notes |
|---|---|---|
| `id` | string | same as its key, e.g. `card-1` or `card-x7k2m9lq3` |
| `title` | string | required, non-empty |
| `details` | string | analyst notes |
| `customerName` | string | required, non-empty |
| `accountLast4` | string | exactly 4 digits. Only the last 4 digits are stored, never the full account number (common card-data practice, PCI) |
| `amount` | number | amount at risk in USD, >= 0 |
| `createdAt` | string | ISO 8601 UTC, set when the case is created |
| `updatedAt` | string | ISO 8601 UTC, set on create, edit, stage move, archive and restore |
| `archivedAt` | string or null | ISO 8601 UTC when archived; null or missing means active |

Timestamps are set by whoever changes the case (the frontend today). Reordering within a stage does not change `updatedAt`.

A card does not store which stage it is in. Its stage is whichever column lists its id in `cardIds`.

**Archiving.** Cases are archived instead of deleted. An archived case keeps its place in its column's `cardIds` (so restoring returns it to the same stage and position) and only gets `archivedAt` set. The board hides archived cases; the Archived page lists them. Permanent deletion is only offered from the Archived page.

## 4. Ordering strategy

Order is the position in an array. There are no position or sort-order fields.

| What | How it is ordered |
|---|---|
| Stages, left to right | order of `data.columns` (always the fixed five) |
| Cases in a stage, top to bottom | order of that column's `cardIds` |
| `data.cards` | unordered lookup map; order is irrelevant |

| Action | Change to the JSON |
|---|---|
| Reorder a case within a stage | move its id within that column's `cardIds` |
| Move a case to another stage | remove its id from one `cardIds`, insert it at the target position in another, set `updatedAt` |
| Add a case | add it to `cards` (with `createdAt` = `updatedAt` = now), append its id to the stage's `cardIds` |
| Archive a case | set `archivedAt` and `updatedAt`; it stays in `cardIds` |
| Restore a case | set `archivedAt` to null and update `updatedAt` |
| Permanently delete an archived case | remove it from `cards` and from its stage's `cardIds` |
| Edit a case | change its fields in `cards` and set `updatedAt` |
| Rename a stage | change the column's `title` |

Because the whole board is saved at once, a move never leaves half-updated positions.

## 5. Data flow

| When | What happens |
|---|---|
| First sign in for a username | create the `users` row and a `boards` row seeded with the five stages and the sample fraud cases |
| Board loads | read `boards.data` for the user, return it as JSON |
| Any change in the UI | frontend sends the whole updated board; backend validates and overwrites `boards.data` |
| AI updates cases | AI returns a whole board; backend validates it the same way, rejects it if any case was removed, sets timestamps by comparing with the stored board, then saves it (HTTP 502 and nothing saved if invalid) |

## 6. Validation

Checked with Pydantic before every save. If any rule fails, the request is rejected (HTTP 422) and the stored board is unchanged.

- Columns are exactly the five fixed ids, in order
- Every id in any `cardIds` exists in `cards`
- Every card in `cards` appears in exactly one column, exactly once
- Each card's `id` matches its key
- Card titles and customer names are non-empty
- `accountLast4` is exactly 4 digits, `amount` >= 0, both timestamps present

## 7. Example

```json
{
  "columns": [
    { "id": "col-alert", "title": "Alert Triggered", "cardIds": ["card-1"] },
    { "id": "col-review", "title": "Review", "cardIds": [] },
    { "id": "col-investigation", "title": "Investigation", "cardIds": ["card-5"] },
    { "id": "col-verification", "title": "Verification", "cardIds": [] },
    { "id": "col-decision", "title": "Decision", "cardIds": [] }
  ],
  "cards": {
    "card-1": {
      "id": "card-1",
      "title": "Velocity rule: 14 card txns in 10 min",
      "details": "Rule engine flagged rapid low-value card-not-present purchases. Auto-hold placed.",
      "customerName": "Daniel Okafor",
      "accountLast4": "4821",
      "amount": 1260.0,
      "createdAt": "2026-11-16T08:42:00Z",
      "updatedAt": "2026-11-16T08:42:00Z"
    },
    "card-5": {
      "id": "card-5",
      "title": "Account takeover - merchant #4471",
      "details": "Pull device fingerprints, IP logs, and linked accounts. Trace fund flow.",
      "customerName": "Kestrel Home Supplies Pty Ltd",
      "accountLast4": "1093",
      "amount": 42300.0,
      "createdAt": "2026-11-14T14:30:00Z",
      "updatedAt": "2026-11-15T23:10:00Z"
    }
  }
}
```

## 8. Why this design, and its limits

Why one JSON document per board:
- It is the exact shape the frontend already uses, so the API, the AI structured output and the UI share one format with no mapping code
- A fraud board holds tens of cases, so rewriting the whole document on each change is cheap
- Ordering stays simple (array positions) and moves are atomic

Limits:
- Querying individual cases in SQL (for example "all cases in Decision") needs SQLite JSON functions; not needed for the MVP
- Two simultaneous edits to the same board: the last save wins. Acceptable with one analyst per board
- Changing the board shape (as when customer, account, amount and timestamps were added) needs existing boards migrated or reset; there is no migration tooling
- If cases later need their own fields, history or an audit trail (common in fraud operations), move cards into a `cases` table with a `position` column. The API can keep the same shape
