#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data
docker build -t fraud-board .
docker rm -f fraud-board >/dev/null 2>&1 || true
docker run -d --name fraud-board -p 8000:8000 --env-file .env -v "$PWD/data:/app/data" fraud-board
echo "Running at http://localhost:8000"
