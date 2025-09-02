// backend/server.js - Main server file
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

// Import routes
const authRoutes = require('./src/routes/auth');
const deedRoutes = require('./src/routes/deeds');
const userRoutes = require('./src/routes/users');
const blockchainRoutes = require('./src/routes/blockchain');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { authMiddleware } = require('./src/middleware/auth');

// Import services
const DatabaseService = require('./src/services/DatabaseService');
const BlockchainService = require('./src/services/BlockchainService');
const IPFSService = require('./src/services/IPFSService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/deeds', authMiddleware, deedRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/blockchain', authMiddleware, blockchainRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database connection
    await DatabaseService.initialize();
    console.log('✅ Database connected successfully');
    
    // Initialize blockchain service
    await BlockchainService.initialize();
    console.log('✅ Blockchain service initialized');
    
    // Initialize IPFS service
    await IPFSService.initialize();
    console.log('✅ IPFS service initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
