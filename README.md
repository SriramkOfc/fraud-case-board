# Fraud Case Board

A case board for fraud analysts. Alerts move through five stages, from Alert Triggered to Decision. An AI copilot proposes case changes, an analyst approves them, and every change lands in an append-only audit trail.

**Live demo:** https://fraud-case-board.onrender.com (login `user` / `password`, all data is fictional; the free server can take up to a minute to wake up)

## What it does

- **Triage at a glance:** cases carry an alert type (card fraud, account takeover, APP scam, identity fraud, money mule, first-party fraud) and a risk level; the header shows open cases, open exposure and the high or critical count
- **Audit trail:** every change to a case (created, edited, moved, archived, restored, deleted) is written to an append-only log with who made it and when, in the same transaction as the save, and shown in the case window
- **Human in the loop AI:** the copilot (OpenRouter, structured outputs) can triage, prioritise and draft analyst notes. Board changes come back as a proposal listing each change; nothing is saved until the analyst applies it, and a proposal made against an older board cannot be applied. Applied changes are logged as "AI, approved by analyst"
- **Guardrails:** every board, human or AI, is validated server-side; the AI cannot delete cases (only archive), and the backend sets timestamps rather than trusting the model
- **Data minimisation:** only the last 4 account digits are stored; archive instead of delete, with a confirmed permanent delete
- Drag-and-drop board with five fixed, renamable stages; persistent per-user boards in SQLite

## Stack

Next.js (static export) served by FastAPI, SQLite, OpenRouter, one Docker container. Tested with pytest (44 tests), Vitest (36, 94% coverage) and Playwright (13 end-to-end, including live AI).

## Run locally

Put `OPENROUTER_API_KEY=...` in `.env`, then:

```bash
scripts/start.sh   # http://localhost:8000
scripts/stop.sh
```

Built on the project brief from Ed Donner's AI Coder course. Planning notes are in `docs/PLAN.md`.
