const express = require('express');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const { executeQuery } = require('../database/connection');
const { verifyToken, requireCitizen, requireGovernmentOfficial, requireBankOfficial } = require('../middleware/auth');
const { verifyOnBlockchain } = require('../services/fabricService');

const router = express.Router();

// Validation middleware
const validateVerificationRequest = [
  body('deedId')
    .isUUID()
    .withMessage('Valid deed ID is required'),
  body('requestType')
    .isIn(['ownership', 'authenticity', 'history'])
    .withMessage('Request type must be ownership, authenticity, or history'),
  body('requestDetails')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Request details must be less than 1000 characters'),
];

// Create verification request
router.post('/request', verifyToken, requireCitizen, validateVerificationRequest, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array(),
      });
    }

    const { deedId, requestType, requestDetails } = req.body;

    // Check if deed exists and user has permission
    const deedQuery = `
      SELECT id, deed_number, owner_id, verification_status
      FROM land_deeds WHERE id = $1
    `;
    const deedResult = await executeQuery(deedQuery, [deedId]);

    if (deedResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Deed not found',
      });
    }

    const deed = deedResult.rows[0];

    // Check if user owns the deed or is an official
    if (deed.owner_id !== req.user.id && req.user.role === 'citizen') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to request verification for this deed',
      });
    }

    // Check if there's already a pending request for this deed and type
    const existingRequestQuery = `
      SELECT id FROM verification_requests 
      WHERE deed_id = $1 AND request_type = $2 AND status = 'pending'
    `;
    const existingRequestResult = await executeQuery(existingRequestQuery, [deedId, requestType]);

    if (existingRequestResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A pending verification request already exists for this deed and type',
      });
    }

    // Create verification request
    const insertRequestQuery = `
      INSERT INTO verification_requests (
        deed_id, requester_id, request_type, request_details, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, deed_id, request_type, status, created_at
    `;

    const insertResult = await executeQuery(insertRequestQuery, [
      deedId,
      req.user.id,
      requestType,
      requestDetails || null,
      'pending',
    ]);

    const newRequest = insertResult.rows[0];

    logger.info(`Verification request created: ${newRequest.id} for deed: ${deed.deed_number}`);

    res.status(201).json({
      message: 'Verification request created successfully',
      request: {
        id: newRequest.id,
        deedId: newRequest.deed_id,
        requestType: newRequest.request_type,
        status: newRequest.status,
        createdAt: newRequest.created_at,
      },
    });
  } catch (error) {
    logger.error('Create verification request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create verification request',
    });
  }
});

// Get verification requests for current user
router.get('/my-requests', verifyToken, requireCitizen, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE vr.requester_id = $1';
    let queryParams = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND vr.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    const query = `
      SELECT vr.id, vr.deed_id, vr.request_type, vr.status, vr.request_details,
             vr.response_details, vr.created_at, vr.processed_at,
             ld.deed_number, ld.property_address
      FROM verification_requests vr
      JOIN land_deeds ld ON vr.deed_id = ld.id
      ${whereClause}
      ORDER BY vr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM verification_requests vr
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      requests: result.rows.map(request => ({
        id: request.id,
        deedId: request.deed_id,
        deedNumber: request.deed_number,
        propertyAddress: request.property_address,
        requestType: request.request_type,
        status: request.status,
        requestDetails: request.request_details,
        responseDetails: request.response_details,
        createdAt: request.created_at,
        processedAt: request.processed_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get my verification requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch verification requests',
    });
  }
});

// Get all verification requests (government officials and bank officials only)
router.get('/requests', verifyToken, requireGovernmentOfficial, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, requestType } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`vr.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (requestType) {
      whereConditions.push(`vr.request_type = $${paramIndex}`);
      queryParams.push(requestType);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT vr.id, vr.deed_id, vr.request_type, vr.status, vr.request_details,
             vr.response_details, vr.created_at, vr.processed_at,
             ld.deed_number, ld.property_address,
             u.first_name, u.last_name, u.email
      FROM verification_requests vr
      JOIN land_deeds ld ON vr.deed_id = ld.id
      JOIN users u ON vr.requester_id = u.id
      ${whereClause}
      ORDER BY vr.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await executeQuery(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM verification_requests vr
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      requests: result.rows.map(request => ({
        id: request.id,
        deedId: request.deed_id,
        deedNumber: request.deed_number,
        propertyAddress: request.property_address,
        requestType: request.request_type,
        status: request.status,
        requestDetails: request.request_details,
        responseDetails: request.response_details,
        requester: {
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
        },
        createdAt: request.created_at,
        processedAt: request.processed_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get verification requests error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch verification requests',
    });
  }
});

// Process verification request (government officials and bank officials only)
router.put('/requests/:id/process', verifyToken, requireGovernmentOfficial, [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  body('responseDetails')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Response details must be less than 1000 characters'),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { status, responseDetails } = req.body;

    // Check if request exists
    const requestQuery = `
      SELECT vr.id, vr.deed_id, vr.request_type, vr.status, ld.deed_number
      FROM verification_requests vr
      JOIN land_deeds ld ON vr.deed_id = ld.id
      WHERE vr.id = $1
    `;
    const requestResult = await executeQuery(requestQuery, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Verification request not found',
      });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request has already been processed',
      });
    }

    // Update verification request
    const updateQuery = `
      UPDATE verification_requests 
      SET status = $1, response_details = $2, processed_at = CURRENT_TIMESTAMP, processed_by = $3
      WHERE id = $4
      RETURNING id, status, response_details, processed_at
    `;

    const updateResult = await executeQuery(updateQuery, [
      status,
      responseDetails || null,
      req.user.id,
      id,
    ]);

    const updatedRequest = updateResult.rows[0];

    logger.info(`Verification request processed: ${updatedRequest.id} by ${req.user.email}`);

    res.json({
      message: 'Verification request processed successfully',
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        responseDetails: updatedRequest.response_details,
        processedAt: updatedRequest.processed_at,
      },
    });
  } catch (error) {
    logger.error('Process verification request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process verification request',
    });
  }
});

// Verify deed on blockchain
router.post('/blockchain/:deedId', verifyToken, requireBankOfficial, async (req, res) => {
  try {
    const { deedId } = req.params;

    // Check if deed exists
    const deedQuery = `
      SELECT id, deed_number, transaction_hash, verification_status
      FROM land_deeds WHERE id = $1
    `;
    const deedResult = await executeQuery(deedQuery, [deedId]);

    if (deedResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Deed not found',
      });
    }

    const deed = deedResult.rows[0];

    if (!deed.transaction_hash) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Deed does not have a blockchain transaction hash',
      });
    }

    // Verify on blockchain
    try {
      const verificationResult = await verifyOnBlockchain(deed.transaction_hash);
      
      logger.info(`Blockchain verification completed for deed: ${deed.deed_number}`);

      res.json({
        message: 'Blockchain verification completed successfully',
        deed: {
          id: deed.id,
          deedNumber: deed.deed_number,
          transactionHash: deed.transaction_hash,
          verificationStatus: deed.verification_status,
        },
        blockchainVerification: verificationResult,
      });
    } catch (blockchainError) {
      logger.error('Blockchain verification error:', blockchainError);
      res.status(500).json({
        error: 'Blockchain Verification Error',
        message: 'Failed to verify deed on blockchain',
        details: blockchainError.message,
      });
    }
  } catch (error) {
    logger.error('Blockchain verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify deed on blockchain',
    });
  }
});

// Get verification statistics
router.get('/stats', verifyToken, requireGovernmentOfficial, async (req, res) => {
  try {
    // Get total verification requests
    const totalRequestsQuery = 'SELECT COUNT(*) as total FROM verification_requests';
    const totalRequestsResult = await executeQuery(totalRequestsQuery);

    // Get requests by status
    const requestsByStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM verification_requests
      GROUP BY status
    `;
    const requestsByStatusResult = await executeQuery(requestsByStatusQuery);

    // Get requests by type
    const requestsByTypeQuery = `
      SELECT request_type, COUNT(*) as count
      FROM verification_requests
      GROUP BY request_type
    `;
    const requestsByTypeResult = await executeQuery(requestsByTypeQuery);

    // Get requests in last 30 days
    const recentRequestsQuery = `
      SELECT COUNT(*) as count
      FROM verification_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const recentRequestsResult = await executeQuery(recentRequestsQuery);

    // Get average processing time
    const avgProcessingTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_hours
      FROM verification_requests
      WHERE processed_at IS NOT NULL
    `;
    const avgProcessingTimeResult = await executeQuery(avgProcessingTimeQuery);

    res.json({
      stats: {
        totalRequests: parseInt(totalRequestsResult.rows[0].total),
        requestsByStatus: requestsByStatusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        requestsByType: requestsByTypeResult.rows.reduce((acc, row) => {
          acc[row.request_type] = parseInt(row.count);
          return acc;
        }, {}),
        recentRequests: parseInt(recentRequestsResult.rows[0].count),
        avgProcessingTimeHours: parseFloat(avgProcessingTimeResult.rows[0].avg_hours) || 0,
      },
    });
  } catch (error) {
    logger.error('Get verification stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch verification statistics',
    });
  }
});

module.exports = router;
