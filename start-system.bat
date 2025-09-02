@echo off
echo ========================================
echo Blockchain Land Registry System
echo ========================================
echo.

echo Starting the complete system...
echo.

echo 1. Starting Docker services (PostgreSQL, IPFS, Fabric)...
docker-compose up -d postgres ipfs fabric-ca fabric-orderer fabric-peer

echo.
echo 2. Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo 3. Setting up database...
cd backend
copy env.example .env
npm install
npm run setup

echo.
echo 4. Starting backend server...
start "Backend Server" cmd /k "npm run dev"

echo.
echo 5. Starting frontend application...
cd ../frontend
npm install
start "Frontend App" cmd /k "npm start"

echo.
echo ========================================
echo System is starting up!
echo ========================================
echo.
echo Backend API: http://localhost:3001
echo Frontend App: http://localhost:3000
echo IPFS Gateway: http://localhost:8080
echo.
echo Default login credentials:
echo Admin: admin@landregistry.com / admin123
echo Government: gov@landregistry.com / gov123
echo Bank: bank@landregistry.com / bank123
echo Citizen: citizen@example.com / citizen123
echo Legal: legal@example.com / legal123
echo.
echo Press any key to exit...
pause > nul
