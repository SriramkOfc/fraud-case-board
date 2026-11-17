# Fraud Case Board

A case board for fraud analysts. Alerts move through five stages, from Alert Triggered to Decision, and an AI assistant in the sidebar can create, edit, move and archive cases on request.

**Live demo:** https://sriramkofc-fraud-case-board.hf.space (login `user` / `password`, all data is fictional)

## What it does

- Drag-and-drop board with five fixed, renamable stages
- Cases with customer, masked account (last 4 digits only), amount at risk, notes and timestamps
- Archive instead of delete, with restore and a confirmed permanent delete
- AI assistant (OpenRouter, structured outputs) that edits the board. Every AI change is validated server-side, timestamps are set by the backend, and an AI board that drops a case is rejected
- Persistent per-user boards in SQLite

## Stack

Next.js (static export) served by FastAPI, SQLite, OpenRouter, one Docker container. Tested with pytest (100% backend coverage), Vitest and Playwright.

## Run locally

Put `OPENROUTER_API_KEY=...` in `.env`, then:

```bash
scripts/start.sh   # http://localhost:8000
scripts/stop.sh
```

Built on the project brief from Ed Donner's AI Coder course. Planning notes are in `docs/PLAN.md`.
