// backend/src/middleware/errorHandler.js - Global error handler
const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  }

  // Database connection errors
  if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  }

  // Duplicate key errors (PostgreSQL)
  if (error.code === '23505') {
    statusCode = 409;
    message = 'Resource already exists';
  }

  // Foreign key constraint errors
  if (error.code === '23503') {
    statusCode = 400;
    message = 'Invalid reference to related resource';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;
