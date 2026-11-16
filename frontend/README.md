# Fraud Case Board - frontend

## Run

The app is served by the backend in Docker: `scripts/start.sh`, then open http://localhost:8000.

For UI-only work: `npm install && npm run dev`.

## Tests

```bash
npm run test:unit   # Vitest
npm run test:e2e    # Playwright, needs the container running (scripts/start.sh)
```
