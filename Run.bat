@echo off
echo Starting Docker containers (just in case)...
docker compose up -d

echo Starting Backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Starting Frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Servers are booting up! You can close this main window.