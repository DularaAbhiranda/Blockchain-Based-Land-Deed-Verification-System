// backend/src/routes/blockchain.js - Blockchain-specific routes
const express = require('express');
const router = express.Router();
const BlockchainService = require('../services/BlockchainService');
const DatabaseService = require('../services/DatabaseService');
const { roleMiddleware } = require('../middleware/auth');

// Get blockchain network information
router.get('/network-info', async (req, res) => {
  try {
    const networkInfo = {
      status: BlockchainService.mockMode ? 'mock' : 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    if (!BlockchainService.mockMode) {
      // Add real network info when connected
      networkInfo.channel = 'landregistry';
      networkInfo.contract = 'landregistry';
    }

    res.json(networkInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get network info', message: error.message });
  }
});

// Get deed from blockchain
router.get('/deed/:deedNumber', async (req, res) => {
  try {
    const { deedNumber } = req.params;
    const deed = await BlockchainService.getDeed(deedNumber);
    res.json(deed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get deed from blockchain', message: error.message });
  }
});

// Verify deed on blockchain (for government officials and bank officials)
router.post('/verify/:deedNumber', roleMiddleware(['government_official', 'bank_official']), async (req, res) => {
  try {
    const { deedNumber } = req.params;
    const { verificationResult, notes } = req.body;
    const verifierId = req.user.id;

    const verificationData = {
      verifierId,
      verificationResult,
      notes,
      timestamp: new Date().toISOString()
    };

    const result = await BlockchainService.verifyDeed(deedNumber, verificationData);

    // Log verification in database
    await DatabaseService.query(
      'INSERT INTO verification_logs (deed_id, verified_by, verification_type, verification_result, notes) VALUES ($1, $2, $3, $4, $5)',
      [deedNumber, verifierId, 'blockchain_verification', verificationResult, notes]
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify deed on blockchain', message: error.message });
  }
});

// Get transaction history for a deed
router.get('/deed/:deedNumber/history', async (req, res) => {
  try {
    const { deedNumber } = req.params;
    
    // Get transaction history from database
    const result = await DatabaseService.query(
      'SELECT * FROM deed_transactions WHERE deed_id = (SELECT id FROM deeds WHERE deed_number = $1) ORDER BY created_at DESC',
      [deedNumber]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transaction history', message: error.message });
  }
});

// Get blockchain statistics
router.get('/stats', roleMiddleware(['admin', 'government_official']), async (req, res) => {
  try {
    const stats = {
      totalDeeds: 0,
      verifiedDeeds: 0,
      pendingDeeds: 0,
      totalTransactions: 0,
      lastBlockNumber: 0,
      networkStatus: BlockchainService.mockMode ? 'mock' : 'connected'
    };

    // Get statistics from database
    const deedsResult = await DatabaseService.query('SELECT COUNT(*) as total FROM deeds');
    const verifiedResult = await DatabaseService.query("SELECT COUNT(*) as verified FROM deeds WHERE verification_status = 'verified'");
    const pendingResult = await DatabaseService.query("SELECT COUNT(*) as pending FROM deeds WHERE verification_status = 'pending'");
    const transactionsResult = await DatabaseService.query('SELECT COUNT(*) as total FROM deed_transactions');

    stats.totalDeeds = parseInt(deedsResult.rows[0].total);
    stats.verifiedDeeds = parseInt(verifiedResult.rows[0].verified);
    stats.pendingDeeds = parseInt(pendingResult.rows[0].pending);
    stats.totalTransactions = parseInt(transactionsResult.rows[0].total);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get blockchain statistics', message: error.message });
  }
});

// Health check for blockchain service
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      blockchain: BlockchainService.mockMode ? 'mock' : 'connected',
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Blockchain service unhealthy', message: error.message });
  }
});

module.exports = router;
