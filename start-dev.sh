#!/bin/bash

# Blockchain Land Registry - Development Startup Script

set -e

echo "🚀 Starting Blockchain Land Registry Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p backend/uploads backend/logs frontend/build

# Set up environment variables if .env doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file with default values..."
    cat > .env << EOF
# Development Environment Variables
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=land_registry
DB_USER=postgres
DB_PASSWORD=postgres123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Hyperledger Fabric Configuration
FABRIC_NETWORK_CONFIG_PATH=/app/fabric-network/connection.json
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=land-registry
FABRIC_WALLET_PATH=/app/fabric-network/wallet

# IPFS Configuration
IPFS_HOST=ipfs
IPFS_PORT=5001
IPFS_PROTOCOL=http

# File Upload Configuration
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/app/logs

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
EOF
    print_success "Created .env file"
fi

# Build and start services
print_status "Building and starting services with Docker Compose..."
docker-compose up --build -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Set up database (migrations and seeding)
print_status "Setting up database..."
docker-compose exec backend npm run setup

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL is not ready yet"
fi

# Check IPFS
if curl -s http://localhost:8080/api/v0/version > /dev/null 2>&1; then
    print_success "IPFS is ready"
else
    print_warning "IPFS is not ready yet"
fi

# Check Backend API
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Backend API is ready"
else
    print_warning "Backend API is not ready yet"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is ready"
else
    print_warning "Frontend is not ready yet"
fi

# Display service URLs
echo ""
print_success "🎉 Development environment is starting up!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:     http://localhost:3000"
echo "   Backend API:  http://localhost:3001"
echo "   API Health:   http://localhost:3001/health"
echo "   IPFS Gateway: http://localhost:8080"
echo "   PostgreSQL:   localhost:5432"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Rebuild:       docker-compose up --build"
echo ""
print_warning "Note: Some services may take a few minutes to fully initialize."
print_warning "The blockchain service will run in mock mode until Hyperledger Fabric is fully configured."
echo ""
print_status "You can now access the application at http://localhost:3000"
