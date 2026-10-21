@echo off
echo Starting Docker containers...
docker compose up -d

echo Starting Backend setup and server...
start "Backend Server" cmd /k "cd backend && npm install && copy .env.example .env && node scripts/ensure-train-token.js && npx prisma migrate dev && npm run prisma:seed && npm run dev"

echo Starting Prediction Service setup and server...
rem 127.0.0.1, not localhost: the backend (Node) resolves localhost to ::1 (IPv6).
start "Prediction Service" cmd /k "cd prediction-service && py -m venv .venv && .venv\Scripts\python -m pip install -r requirements.txt && (if not exist model\model.joblib .venv\Scripts\python training\train.py) && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Starting Frontend setup and server...
start "Frontend Server" cmd /k "cd frontend && npm install && copy .env.example .env && npm run dev"

echo All processes started! You can close this main window.