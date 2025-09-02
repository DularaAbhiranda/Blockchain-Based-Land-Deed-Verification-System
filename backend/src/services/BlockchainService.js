// backend/src/services/BlockchainService.js - Blockchain integration
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

class BlockchainService {
  constructor() {
    this.gateway = null;
    this.network = null;
    this.contract = null;
  }

  async initialize() {
    try {
      // Load connection profile
      const connectionProfilePath = path.resolve(__dirname, '../../fabric-network/connection-profile.json');
      
      // For now, we'll use a mock implementation until Hyperledger is fully set up
      if (!fs.existsSync(connectionProfilePath)) {
        console.log('⚠️  Blockchain service running in mock mode');
        this.mockMode = true;
        return;
      }

      const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

      // Create wallet
      const walletPath = path.join(__dirname, '../../wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      // Create gateway
      this.gateway = new Gateway();
      await this.gateway.connect(connectionProfile, {
        wallet,
        identity: 'appUser',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get network
      this.network = await this.gateway.getNetwork('landregistry');
      this.contract = this.network.getContract('landregistry');

      console.log('✅ Connected to Hyperledger Fabric network');
    } catch (error) {
      console.log('⚠️  Blockchain service running in mock mode due to:', error.message);
      this.mockMode = true;
    }
  }

  async createDeed(deedData) {
    if (this.mockMode) {
      return {
        transactionId: 'mock_tx_' + Date.now(),
        blockNumber: Math.floor(Math.random() * 1000),
        success: true
      };
    }

    try {
      const result = await this.contract.submitTransaction('CreateDeed', 
        deedData.deedNumber,
        deedData.ownerId,
        deedData.propertyAddress,
        deedData.documentHash,
        JSON.stringify(deedData)
      );

      return {
        transactionId: result.toString(),
        success: true
      };
    } catch (error) {
      console.error('Blockchain transaction failed:', error);
      throw error;
    }
  }

  async getDeed(deedNumber) {
    if (this.mockMode) {
      return {
        deedNumber,
        owner: 'Mock Owner',
        status: 'verified',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.contract.evaluateTransaction('GetDeed', deedNumber);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error('Blockchain query failed:', error);
      throw error;
    }
  }

  async verifyDeed(deedNumber, verificationData) {
    if (this.mockMode) {
      return {
        transactionId: 'mock_verification_' + Date.now(),
        verified: true,
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await this.contract.submitTransaction('VerifyDeed',
        deedNumber,
        verificationData.verifierId,
        verificationData.verificationResult,
        JSON.stringify(verificationData)
      );

      return {
        transactionId: result.toString(),
        verified: true
      };
    } catch (error) {
      console.error('Blockchain verification failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
    }
  }
}

module.exports = new BlockchainService();
