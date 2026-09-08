@echo off
echo Starting Docker containers...
docker compose up -d

echo Starting Backend setup and server...
start "Backend Server" cmd /k "cd backend && npm install && copy .env.example .env && npx prisma migrate dev && npm run prisma:seed && npm run dev"

echo Starting Frontend setup and server...
start "Frontend Server" cmd /k "cd frontend && npm install && copy .env.example .env && npm run dev"

echo All processes started! You can close this main window.