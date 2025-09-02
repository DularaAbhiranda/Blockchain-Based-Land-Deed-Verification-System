// backend/src/routes/users.js - User management routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const DatabaseService = require('../services/DatabaseService');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin and government officials only)
router.get('/', authMiddleware, roleMiddleware(['admin', 'government_official']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT id, username, email, role, full_name, phone, address, 
             is_active, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await DatabaseService.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;
    const countResult = await DatabaseService.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      users: result.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch users',
    });
  }
});

// Get user by ID (admin and government officials only)
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'government_official']), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT id, username, email, role, full_name, phone, address, 
             is_active, created_at, updated_at
      FROM users WHERE id = $1
    `;

    const result = await DatabaseService.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        address: user.address,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user',
    });
  }
});

// Update user (admin only)
router.put('/:id', authMiddleware, roleMiddleware(['admin']), [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Full name must be less than 255 characters'),
  body('role')
    .optional()
    .isIn(['citizen', 'government_official', 'bank_official', 'admin'])
    .withMessage('Invalid role specified'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('phone')
    .optional()
    .isLength({ min: 10, max: 20 })
    .withMessage('Please provide a valid phone number'),
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
    const { full_name, role, is_active, phone, address } = req.body;

    // Check if user exists
    const existingUserQuery = 'SELECT id, email FROM users WHERE id = $1';
    const existingUserResult = await DatabaseService.query(existingUserQuery, [id]);

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex}`);
      updateValues.push(full_name);
      paramIndex++;
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(role);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(is_active);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }

    if (address !== undefined) {
      updateFields.push(`address = $${paramIndex}`);
      updateValues.push(address);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No fields to update',
      });
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, role, full_name, phone, address, 
                is_active, created_at, updated_at
    `;

    const updateResult = await DatabaseService.query(updateQuery, updateValues);
    const updatedUser = updateResult.rows[0];

    console.log(`User updated: ${updatedUser.email} by admin: ${req.user.email}`);

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        is_active: updatedUser.is_active,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user',
    });
  }
});

// Get user statistics (admin and government officials only)
router.get('/stats/overview', authMiddleware, roleMiddleware(['admin', 'government_official']), async (req, res) => {
  try {
    // Get total users count
    const totalUsersQuery = 'SELECT COUNT(*) as total FROM users';
    const totalUsersResult = await DatabaseService.query(totalUsersQuery);

    // Get users by role
    const usersByRoleQuery = `
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `;
    const usersByRoleResult = await DatabaseService.query(usersByRoleQuery);

    // Get active vs inactive users
    const activeUsersQuery = `
      SELECT is_active, COUNT(*) as count
      FROM users
      GROUP BY is_active
    `;
    const activeUsersResult = await DatabaseService.query(activeUsersQuery);

    // Get users registered in last 30 days
    const recentUsersQuery = `
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;
    const recentUsersResult = await DatabaseService.query(recentUsersQuery);

    res.json({
      stats: {
        totalUsers: parseInt(totalUsersResult.rows[0].total),
        usersByRole: usersByRoleResult.rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {}),
        activeUsers: activeUsersResult.rows.reduce((acc, row) => {
          acc[row.is_active ? 'active' : 'inactive'] = parseInt(row.count);
          return acc;
        }, {}),
        recentUsers: parseInt(recentUsersResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user statistics',
    });
  }
});

module.exports = router;