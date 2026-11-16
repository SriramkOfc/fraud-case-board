# Scripts

Start and stop the app in Docker. Run from anywhere; they work from the project root.

- `start.sh` / `start.ps1` (Mac, Linux / Windows PowerShell) - build the `fraud-board` image, replace any running `fraud-board` container, run it on port 8000 with `--env-file .env` and `data/` mounted at `/app/data`
- `stop.sh` / `stop.ps1` - remove the `fraud-board` container

App URL: http://localhost:8000
