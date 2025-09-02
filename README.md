# Blockchain Land Deed Verification System

A comprehensive blockchain-based solution for secure land deed verification and management, built with Hyperledger Fabric, Node.js, and React.js. This system implements the research proposal for "Blockchain-Based Land Deed Verification in Sri Lanka: Enhancing Transparency, Security and Compliance with PDPA".

## 🏗️ Project Architecture

### Backend Components
- **Hyperledger Fabric Network**: Permissioned blockchain for deed verification
- **Node.js API Server**: RESTful services for frontend communication
- **PostgreSQL Database**: Off-chain data storage for metadata
- **IPFS Integration**: Distributed file storage for deed documents
- **Authentication & Authorization**: Role-based access control

### Frontend Components
- **React.js Web Portal**: User interface for all stakeholders
- **Dashboard**: Different views for citizens, government officials, banks
- **Document Upload/Verification**: Deed digitization interface
- **Search & Query System**: Land deed lookup functionality

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (with Docker Compose)
- Node.js 18+ (for local development)
- Git

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
# Run the automated setup script
.\start-system.bat
```

**Linux/Mac:**
```bash
# Make script executable and run
chmod +x start-system.sh
./start-system.sh
```

### Option 2: Manual Setup

1. **Start Docker services**
   ```bash
   docker-compose up -d postgres ipfs fabric-ca fabric-orderer fabric-peer
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp env.example .env
   npm install
   npm run setup
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/health
   - IPFS Gateway: http://localhost:8080

## 📁 Project Structure

```
blockchain-land-registry/
├── fabric-network/          # Hyperledger Fabric network configuration
│   ├── chaincode/           # Smart contracts (Go)
│   ├── configtx.yaml        # Network configuration
│   └── docker-compose.yml   # Fabric services
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Authentication & validation
│   │   └── database/        # Database schemas
│   └── server.js           # Main server file
├── frontend/               # React.js web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── App.js         # Main app component
│   └── public/            # Static assets
├── database/              # Database migrations
└── docs/                  # Documentation
```

## 🔧 Technology Stack

### Blockchain Layer
- **Hyperledger Fabric 2.4+**: Permissioned blockchain network
- **Fabric SDK for Node.js**: Blockchain integration
- **Certificate Authority (CA)**: Identity management
- **Smart Contracts (Go)**: Deed management logic

### Backend
- **Node.js with Express.js**: RESTful API server
- **PostgreSQL**: Relational database for metadata
- **IPFS**: Distributed file storage for documents
- **JWT**: Authentication and authorization
- **Multer**: File upload handling
- **Winston**: Logging system

### Frontend
- **React.js 18+**: Modern web interface
- **Material-UI**: Component library
- **Axios**: HTTP client for API calls
- **React Router**: Navigation management
- **Formik & Yup**: Form handling and validation

## 👥 User Roles & Permissions

### Citizen
- Search and view own deeds
- Request deed verification
- Download deed documents

### Government Official
- Create new deeds
- Verify deed authenticity
- Access all deed information
- Manage system operations

### Bank Official
- Verify property ownership
- Access deed information for loans
- Blockchain verification

### Legal Professional
- Create and verify deeds
- Access legal documents
- Provide legal consultation

### Administrator
- Full system access
- User management
- System configuration

## 🔐 Security Features

- **Multi-signature validation**: Multiple approvals for critical operations
- **Role-based access control**: Granular permissions per user type
- **Secure document storage**: IPFS with cryptographic hashing
- **Audit trails**: Complete operation logging
- **PDPA compliance**: Privacy by design implementation
- **Blockchain immutability**: Tamper-proof record keeping

## 📊 System Features

### Deed Management
- Create new land deeds with document upload
- Digital signature and verification
- Blockchain transaction recording
- IPFS document storage
- Ownership transfer tracking

### Search & Verification
- Advanced search with multiple filters
- Real-time verification status
- Document integrity checking
- Blockchain verification
- Historical record access

### Dashboard & Analytics
- Role-specific dashboards
- System statistics
- Recent activity tracking
- Performance metrics
- User activity monitoring

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=land_registry
DB_USER=postgres
DB_PASSWORD=postgres123

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Blockchain
FABRIC_NETWORK_CONFIG_PATH=../fabric-network/connection-profile.json
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=land-registry

# IPFS
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

### Database Schema

The system uses PostgreSQL with the following main tables:
- `users`: User accounts and roles
- `deeds`: Land deed records
- `deed_transactions`: Blockchain transactions
- `verification_logs`: Verification history

## 🧪 Testing

### Default Login Credentials

After running the setup, use these test accounts:

- **Admin**: admin@landregistry.com / admin123
- **Government**: gov@landregistry.com / gov123  
- **Bank**: bank@landregistry.com / bank123
- **Citizen**: citizen@example.com / citizen123
- **Legal Professional**: legal@example.com / legal123

### Test Commands

```bash
# Test all services
npm test

# Test authentication
npm run test:auth

# Test deed management
npm run test:deeds

# Health check
curl http://localhost:3001/health
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000, 3001, 5432, 7050, 7051, 7054, 8080 are available
   - Stop conflicting services

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   docker-compose logs postgres
   
   # Reset database
   docker-compose down
   docker-compose up -d postgres
   ```

3. **Blockchain Network Issues**
   ```bash
   # Check Fabric services
   docker-compose logs fabric-peer
   
   # Restart Fabric network
   docker-compose restart fabric-ca fabric-orderer fabric-peer
   ```

4. **IPFS Connection Issues**
   ```bash
   # Check IPFS status
   docker-compose logs ipfs
   
   # Test IPFS connectivity
   curl http://localhost:5001/api/v0/version
   ```

### Service Health Checks

```bash
# Backend API
curl http://localhost:3001/health

# IPFS Gateway
curl http://localhost:8080/ipfs/QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn

# Database
docker-compose exec postgres pg_isready -U postgres
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-token` - Token verification

### Deed Management Endpoints
- `POST /api/deeds/create` - Create new deed
- `GET /api/deeds/search` - Search deeds
- `GET /api/deeds/number/:deedNumber` - Get deed by number
- `POST /api/deeds/:id/verify` - Verify deed
- `GET /api/deeds/:id/document` - Download document

### Blockchain Endpoints
- `GET /api/blockchain/network-info` - Network information
- `GET /api/blockchain/deed/:deedNumber` - Get deed from blockchain
- `POST /api/blockchain/verify/:deedNumber` - Blockchain verification
- `GET /api/blockchain/stats` - Blockchain statistics

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DB_PASSWORD=secure_password
   export JWT_SECRET=secure_jwt_secret
   ```

2. **Docker Production Build**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **SSL Configuration**
   - Configure reverse proxy (Nginx)
   - Set up SSL certificates
   - Configure domain names

### Scaling Considerations

- **Database**: Use PostgreSQL clustering for high availability
- **Blockchain**: Deploy multiple Fabric peers for redundancy
- **IPFS**: Use IPFS cluster for distributed storage
- **Load Balancing**: Implement load balancer for API servers

## 📈 Performance Metrics

### Expected Performance
- **Verification Time**: 60-80% reduction (from 2-4 weeks to 1-3 days)
- **Fraud Detection**: 70-90% improvement
- **Error Rate**: 50-70% reduction
- **Cost Savings**: 40-60% reduction in administrative costs
- **User Satisfaction**: 85%+ satisfaction rate

### Monitoring
- System uptime monitoring
- API response time tracking
- Blockchain transaction metrics
- User activity analytics
- Error rate monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation
- Follow semantic versioning

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- Mobile application development
- Advanced analytics dashboard
- Integration with government systems
- Multi-language support
- Advanced fraud detection algorithms
- Integration with other blockchain networks
