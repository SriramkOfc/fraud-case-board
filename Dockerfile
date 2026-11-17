FROM node:24-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Set to 1 for the hosted demo (per-browser boards, login hint)
ARG NEXT_PUBLIC_DEMO=""
ENV NEXT_PUBLIC_DEMO=$NEXT_PUBLIC_DEMO
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app/backend
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend /frontend/out ./static

# Writable data dir so the app also runs as a non-root user (e.g. on Hugging Face Spaces)
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8000
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
