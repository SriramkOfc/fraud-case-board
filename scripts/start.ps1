$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
New-Item -ItemType Directory -Force -Path data | Out-Null
docker build -t fraud-board .
docker rm -f fraud-board 2>$null
docker run -d --name fraud-board -p 8000:8000 --env-file .env -v "${PWD}/data:/app/data" fraud-board
Write-Host "Running at http://localhost:8000"
