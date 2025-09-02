@echo off
REM Blockchain Land Registry - Development Startup Script for Windows

echo 🚀 Starting Blockchain Land Registry Development Environment...

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
if not exist "frontend\build" mkdir frontend\build

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

REM Build and start services
echo [INFO] Building and starting services with Docker Compose...
docker-compose up --build -d

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Set up database (migrations and seeding)
echo [INFO] Setting up database...
docker-compose exec backend npm run setup

REM Display service URLs
echo.
echo [SUCCESS] 🎉 Development environment is starting up!
echo.
echo 📋 Service URLs:
echo    Frontend:     http://localhost:3000
echo    Backend API:  http://localhost:3001
echo    API Health:   http://localhost:3001/health
echo    IPFS Gateway: http://localhost:8080
echo    PostgreSQL:   localhost:5432
echo.
echo 🔧 Useful Commands:
echo    View logs:     docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart:       docker-compose restart
echo    Rebuild:       docker-compose up --build
echo.
echo [WARNING] Note: Some services may take a few minutes to fully initialize.
echo [WARNING] The blockchain service will run in mock mode until Hyperledger Fabric is fully configured.
echo.
echo [INFO] You can now access the application at http://localhost:3000
echo.
pause
