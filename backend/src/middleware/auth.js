// backend/src/middleware/auth.js - Authentication middleware
const jwt = require('jsonwebtoken');
const DatabaseService = require('../services/DatabaseService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Basic authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data from database
    const result = await DatabaseService.query(
      'SELECT id, username, email, role, full_name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based access control middleware
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// PDPA compliance middleware - logs data access
const pdpaLoggingMiddleware = async (req, res, next) => {
  try {
    if (req.user && req.method === 'GET') {
      // Log data access for PDPA compliance
      const accessLog = {
        user_id: req.user.id,
        endpoint: req.originalUrl,
        method: req.method,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      };

      // In a production system, you would store this in a separate audit table
      console.log('Data access log:', accessLog);
    }
    
    next();
  } catch (error) {
    console.error('PDPA logging error:', error);
    next(); // Continue even if logging fails
  }
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  pdpaLoggingMiddleware
};
