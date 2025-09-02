// backend/src/routes/deeds.js - Deed management routes
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const DatabaseService = require('../services/DatabaseService');
const BlockchainService = require('../services/BlockchainService');
const IPFSService = require('../services/IPFSService');
const { roleMiddleware, pdpaLoggingMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/deeds';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deed-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, images, and document files
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, DOC, DOCX) and images are allowed'));
    }
  }
});

// Create new deed
router.post('/create', 
  roleMiddleware(['government_official', 'legal_professional']),
  upload.single('document'),
  [
    body('deed_number').notEmpty().withMessage('Deed number is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('owner_id').isInt().withMessage('Valid owner ID is required'),
    body('property_address').notEmpty().withMessage('Property address is required'),
    body('extent').notEmpty().withMessage('Property extent is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        deed_number,
        title,
        description,
        owner_id,
        property_address,
        survey_plan_number,
        extent,
        boundaries
      } = req.body;

      // Check if deed number already exists
      const existingDeed = await DatabaseService.query(
        'SELECT id FROM deeds WHERE deed_number = $1',
        [deed_number]
      );

      if (existingDeed.rows.length > 0) {
        return res.status(409).json({
          error: 'Deed with this number already exists'
        });
      }

      let document_hash = null;
      let ipfs_hash = null;

      // Process uploaded document
      if (req.file) {
        // Calculate SHA-256 hash of the document
        const fileBuffer = fs.readFileSync(req.file.path);
        document_hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Upload to IPFS
        try {
          ipfs_hash = await IPFSService.uploadFile(req.file.path);
          console.log('Document uploaded to IPFS:', ipfs_hash);
        } catch (ipfsError) {
          console.error('IPFS upload failed:', ipfsError);
          // Continue without IPFS for now
        }

        // Clean up local file after IPFS upload
        fs.unlinkSync(req.file.path);
      }

      // Create deed in database
      const deedResult = await DatabaseService.query(
        `INSERT INTO deeds (deed_number, title, description, owner_id, property_address, 
         survey_plan_number, extent, boundaries, document_hash, ipfs_hash, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [deed_number, title, description, owner_id, property_address, survey_plan_number,
         extent, boundaries, document_hash, ipfs_hash, req.user.id]
      );

      const deed = deedResult.rows[0];

      // Create blockchain transaction
      try {
        const blockchainResult = await BlockchainService.createDeed({
          deedNumber: deed_number,
          ownerId: owner_id,
          propertyAddress: property_address,
          documentHash: document_hash,
          createdBy: req.user.id,
          timestamp: new Date().toISOString()
        });

        // Update deed with blockchain transaction ID
        await DatabaseService.query(
          'UPDATE deeds SET blockchain_transaction_id = $1 WHERE id = $2',
          [blockchainResult.transactionId, deed.id]
        );

        deed.blockchain_transaction_id = blockchainResult.transactionId;
      } catch (blockchainError) {
        console.error('Blockchain transaction failed:', blockchainError);
        // Continue without blockchain for now
      }

      res.status(201).json({
        message: 'Deed created successfully',
        deed: deed
      });

    } catch (error) {
      console.error('Deed creation error:', error);
      res.status(500).json({ error: 'Failed to create deed' });
    }
  }
);

// Get deed by deed number
router.get('/number/:deed_number', 
  pdpaLoggingMiddleware,
  async (req, res) => {
    try {
      const { deed_number } = req.params;

      const result = await DatabaseService.query(
        `SELECT d.*, u.full_name as owner_name, u.email as owner_email,
         creator.full_name as created_by_name, verifier.full_name as verified_by_name
         FROM deeds d
         LEFT JOIN users u ON d.owner_id = u.id
         LEFT JOIN users creator ON d.created_by = creator.id
         LEFT JOIN users verifier ON d.verified_by = verifier.id
         WHERE d.deed_number = $1`,
        [deed_number]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deed not found' });
      }

      const deed = result.rows[0];

      // Check access permissions
      const canViewSensitiveData = req.user.role === 'government_official' || 
                                  req.user.role === 'legal_professional' ||
                                  deed.owner_id === req.user.id;

      if (!canViewSensitiveData) {
        // Return limited information for unauthorized users
        const limitedDeed = {
          id: deed.id,
          deed_number: deed.deed_number,
          title: deed.title,
          property_address: deed.property_address,
          extent: deed.extent,
          verification_status: deed.verification_status,
          created_at: deed.created_at
        };
        return res.json({ deed: limitedDeed });
      }

      // Get blockchain verification if available
      let blockchainData = null;
      try {
        if (deed.deed_number) {
          blockchainData = await BlockchainService.getDeed(deed.deed_number);
        }
      } catch (error) {
        console.error('Blockchain query failed:', error);
      }

      res.json({
        deed: deed,
        blockchain: blockchainData
      });

    } catch (error) {
      console.error('Deed retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve deed' });
    }
  }
);

// Search deeds
router.get('/search', 
  pdpaLoggingMiddleware,
  async (req, res) => {
    try {
      const {
        query,
        owner_name,
        property_address,
        verification_status,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let queryParams = [];
      let paramCount = 0;

      // Build dynamic query based on search parameters
      if (query) {
        paramCount++;
        whereClause += ` AND (d.deed_number ILIKE $${paramCount} OR d.title ILIKE $${paramCount})`;
        queryParams.push(`%${query}%`);
      }

      if (owner_name) {
        paramCount++;
        whereClause += ` AND u.full_name ILIKE $${paramCount}`;
        queryParams.push(`%${owner_name}%`);
      }

      if (property_address) {
        paramCount++;
        whereClause += ` AND d.property_address ILIKE $${paramCount}`;
        queryParams.push(`%${property_address}%`);
      }

      if (verification_status) {
        paramCount++;
        whereClause += ` AND d.verification_status = $${paramCount}`;
        queryParams.push(verification_status);
      }

      // Restrict access based on user role
      if (req.user.role === 'citizen') {
        paramCount++;
        whereClause += ` AND d.owner_id = $${paramCount}`;
        queryParams.push(req.user.id);
      }

      const searchQuery = `
        SELECT d.id, d.deed_number, d.title, d.property_address, d.extent,
               d.verification_status, d.created_at, u.full_name as owner_name
        FROM deeds d
        LEFT JOIN users u ON d.owner_id = u.id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const result = await DatabaseService.query(searchQuery, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM deeds d
        LEFT JOIN users u ON d.owner_id = u.id
        ${whereClause}
      `;

      const countResult = await DatabaseService.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      res.json({
        deeds: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Deed search error:', error);
      res.status(500).json({ error: 'Failed to search deeds' });
    }
  }
);

// Verify deed
router.post('/:id/verify',
  roleMiddleware(['government_official', 'legal_professional']),
  [
    body('verification_result').isIn(['verified', 'rejected']).withMessage('Invalid verification result'),
    body('notes').optional().isString().withMessage('Notes must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { verification_result, notes } = req.body;

      // Get the deed
      const deedResult = await DatabaseService.query(
        'SELECT * FROM deeds WHERE id = $1',
        [id]
      );

      if (deedResult.rows.length === 0) {
        return res.status(404).json({ error: 'Deed not found' });
      }

      const deed = deedResult.rows[0];

      // Update deed verification status
      await DatabaseService.query(
        'UPDATE deeds SET verification_status = $1, verified_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [verification_result, req.user.id, id]
      );

      // Create verification log
      await DatabaseService.query(
        `INSERT INTO verification_logs (deed_id, verified_by, verification_type, verification_result, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, req.user.id, 'manual_verification', verification_result, notes]
      );

      // Create blockchain verification record
      try {
        await BlockchainService.verifyDeed(deed.deed_number, {
          verifierId: req.user.id,
          verificationResult: verification_result,
          notes: notes,
          timestamp: new Date().toISOString()
        });
      } catch (blockchainError) {
        console.error('Blockchain verification failed:', blockchainError);
      }

      res.json({
        message: 'Deed verification completed successfully',
        verification_result: verification_result
      });

    } catch (error) {
      console.error('Deed verification error:', error);
      res.status(500).json({ error: 'Failed to verify deed' });
    }
  }
);

// Get deed document from IPFS
router.get('/:id/document', 
  pdpaLoggingMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get deed information
      const result = await DatabaseService.query(
        'SELECT ipfs_hash, owner_id FROM deeds WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deed not found' });
      }

      const deed = result.rows[0];

      // Check access permissions
      const canAccess = req.user.role === 'government_official' || 
                       req.user.role === 'legal_professional' ||
                       deed.owner_id === req.user.id;

      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!deed.ipfs_hash) {
        return res.status(404).json({ error: 'Document not available' });
      }

      // Retrieve document from IPFS
      const documentBuffer = await IPFSService.getFile(deed.ipfs_hash);
      
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="deed-${id}-document"`
      });
      
      res.send(documentBuffer);

    } catch (error) {
      console.error('Document retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }
);

module.exports = router;
