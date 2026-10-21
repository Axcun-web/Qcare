@echo off
echo Starting Docker containers (just in case)...
docker compose up -d

echo Starting Backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Starting Prediction Service...
rem 127.0.0.1, not localhost: the backend (Node) resolves localhost to ::1 (IPv6).
start "Prediction Service" cmd /k "cd prediction-service && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Starting Frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Servers are booting up! You can close this main window.