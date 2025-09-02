@echo off
REM Blockchain Land Registry - Local Development Startup Script for Windows

echo 🚀 Starting Blockchain Land Registry Local Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not available. Please install Docker Compose and try again.
    pause
    exit /b 1
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "backend\uploads" mkdir backend\uploads
if not exist "backend\logs" mkdir backend\logs

REM Set up environment variables if .env doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env file with default values...
    (
        echo # Development Environment Variables
        echo NODE_ENV=development
        echo PORT=3001
        echo.
        echo # Database Configuration
        echo DB_HOST=postgres
        echo DB_PORT=5432
        echo DB_NAME=land_registry
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres123
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-change-in-production
        echo JWT_EXPIRES_IN=24h
        echo.
        echo # Hyperledger Fabric Configuration
        echo FABRIC_NETWORK_CONFIG_PATH=/app/fabric-network/connection.json
        echo FABRIC_CHANNEL_NAME=mychannel
        echo FABRIC_CHAINCODE_NAME=land-registry
        echo FABRIC_WALLET_PATH=/app/fabric-network/wallet
        echo.
        echo # IPFS Configuration
        echo IPFS_HOST=ipfs
        echo IPFS_PORT=5001
        echo IPFS_PROTOCOL=http
        echo.
        echo # File Upload Configuration
        echo UPLOAD_PATH=/app/uploads
        echo MAX_FILE_SIZE=10485760
        echo.
        echo # Security Configuration
        echo BCRYPT_ROUNDS=12
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo # Logging Configuration
        echo LOG_LEVEL=info
        echo LOG_FILE_PATH=/app/logs
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:3000
    ) > .env
    echo [SUCCESS] Created .env file
)

REM Start only essential services (PostgreSQL and IPFS)
echo [INFO] Starting essential services with Docker Compose...
docker-compose up postgres ipfs -d

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Install backend dependencies if not already installed
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    npm install
    cd ..
)

REM Set up database (migrations and seeding)
echo [INFO] Setting up database...
cd backend
npm run setup
cd ..

REM Start backend in development mode
echo [INFO] Starting backend server...
cd backend
start "Backend Server" cmd /k "npm run dev"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Display service URLs
echo.
echo [SUCCESS] 🎉 Local development environment is starting up!
echo.
echo 📋 Service URLs:
echo    Backend API:  http://localhost:3001
echo    API Health:   http://localhost:3001/health
echo    IPFS Gateway: http://localhost:8080
echo    PostgreSQL:   localhost:5432
echo.
echo 🔧 Useful Commands:
echo    Test system:  npm test
echo    Test auth:    npm run test:auth
echo    View logs:    docker-compose logs -f
echo    Stop services: docker-compose down
echo.
echo [INFO] Backend server is running in a new window.
echo [INFO] You can now test the authentication system.
echo.
pause
