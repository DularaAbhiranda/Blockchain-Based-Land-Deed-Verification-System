# Blockchain Land Registry System - Setup Instructions

This document provides step-by-step instructions for setting up the complete Blockchain Land Registry system.

## Prerequisites

Before starting the setup, ensure you have the following installed:

### Required Software
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Docker** (v20 or higher)
- **Docker Compose** (v2 or higher)
- **PostgreSQL** (v13 or higher)
- **Git**

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd blockchain-land-registry
```

### 2. Set Up the Backend

#### 2.1 Install Dependencies

```bash
cd backend
npm install
```

#### 2.2 Configure Environment Variables

```bash
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=land_registry
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Hyperledger Fabric Configuration
FABRIC_NETWORK_CONFIG_PATH=../fabric-network/connection-org1.json
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=land-registry
FABRIC_WALLET_PATH=./wallet

# IPFS Configuration
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

#### 2.3 Set Up PostgreSQL Database

1. **Install PostgreSQL** (if not already installed)
2. **Create Database**:

```sql
CREATE DATABASE land_registry;
CREATE USER land_registry_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE land_registry TO land_registry_user;
```

3. **Run Database Migrations**:

```bash
npm run migrate
```

4. **Seed Initial Data** (optional):

```bash
npm run seed
```

#### 2.4 Set Up IPFS

1. **Install IPFS**:

```bash
# Download IPFS
wget https://dist.ipfs.io/go-ipfs/v0.18.0/go-ipfs_v0.18.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.18.0_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh

# Initialize IPFS
ipfs init

# Start IPFS daemon
ipfs daemon &
```

2. **Verify IPFS is running**:

```bash
ipfs id
```

### 3. Set Up Hyperledger Fabric Network

#### 3.1 Navigate to Fabric Directory

```bash
cd ../fabric-network
```

#### 3.2 Make Network Script Executable

```bash
chmod +x network.sh
```

#### 3.3 Start the Fabric Network

```bash
./network.sh up
```

This command will:
- Download Fabric binaries
- Generate crypto materials
- Create genesis block
- Start all network components
- Set up channels
- Install and instantiate chaincode

#### 3.4 Verify Network Status

```bash
docker ps
```

You should see containers running for:
- orderer.example.com
- peer0.org1.example.com
- peer0.org2.example.com
- couchdb0
- couchdb1
- cli

### 4. Set Up the Frontend

#### 4.1 Install Dependencies

```bash
cd ../frontend
npm install
```

#### 4.2 Start the Frontend

```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### 5. Start the Backend Server

```bash
cd ../backend
npm run dev
```

The backend API will be available at `http://localhost:3001`

## Verification Steps

### 1. Check Backend Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. Check Fabric Network

```bash
# Check if all containers are running
docker ps

# Check network logs
docker logs orderer.example.com
docker logs peer0.org1.example.com
```

### 3. Check IPFS

```bash
# Check IPFS node info
curl http://localhost:5001/api/v0/id
```

### 4. Test Frontend

1. Open `http://localhost:3000` in your browser
2. You should see the login page
3. Register a new user account
4. Test the basic functionality

## Development Workflow

### 1. Backend Development

```bash
cd backend
npm run dev  # Start with nodemon for auto-reload
```

### 2. Frontend Development

```bash
cd frontend
npm start    # Start with hot reload
```

### 3. Database Changes

```bash
cd backend
# Create new migration
npm run migrate:create -- migration_name

# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback
```

### 4. Fabric Network Management

```bash
cd fabric-network

# Stop network
./network.sh down

# Restart network
./network.sh restart

# Clean everything
./network.sh clean
```

## Troubleshooting

### Common Issues

#### 1. Port Conflicts

If you get port conflicts, check:
- Port 3000 (Frontend)
- Port 3001 (Backend)
- Port 7050-7052 (Fabric Orderer)
- Port 8051-8052 (Fabric Peer)
- Port 5001 (IPFS)

#### 2. Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U postgres -d land_registry
```

#### 3. Fabric Network Issues

```bash
# Check container logs
docker logs orderer.example.com
docker logs peer0.org1.example.com

# Restart network
./network.sh down
./network.sh up
```

#### 4. IPFS Issues

```bash
# Check IPFS daemon
ipfs daemon

# Reset IPFS (if needed)
rm -rf ~/.ipfs
ipfs init
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_deeds_owner_id ON land_deeds(owner_id);
CREATE INDEX CONCURRENTLY idx_deeds_status ON land_deeds(status);
CREATE INDEX CONCURRENTLY idx_deeds_created_at ON land_deeds(created_at);
```

#### 2. Fabric Network Optimization

```bash
# Increase Docker memory limit
# Edit docker-compose.yml to add memory limits
```

#### 3. IPFS Optimization

```bash
# Configure IPFS for better performance
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique passwords
- Rotate JWT secrets regularly

### 2. Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access

### 3. Fabric Network Security

- Use TLS in production
- Implement proper access controls
- Regular certificate rotation

### 4. IPFS Security

- Configure CORS properly
- Use private networks for sensitive data
- Implement access controls

## Production Deployment

### 1. Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Use production database
export DB_HOST=your_production_db_host
export DB_PASSWORD=your_production_db_password

# Use production Fabric network
export FABRIC_NETWORK_CONFIG_PATH=/path/to/production/config
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Use Process Manager

```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name "land-registry-backend"

# Start frontend with PM2
cd frontend
pm2 start npm --name "land-registry-frontend" -- start
```

### 4. Set Up Reverse Proxy

Configure Nginx or Apache to serve the frontend and proxy API requests to the backend.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review the logs in `backend/logs/`
3. Check Docker container logs
4. Create an issue in the project repository

## Next Steps

After successful setup:

1. **Create Admin User**: Register an admin user through the frontend
2. **Configure Roles**: Set up user roles and permissions
3. **Test Functionality**: Create test deeds and verify the workflow
4. **Customize**: Modify the system according to your requirements
5. **Deploy**: Deploy to production environment
