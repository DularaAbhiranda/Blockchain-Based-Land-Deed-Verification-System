const { Wallets, Gateway } = require('fabric-network');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

let gateway;
let network;
let contract;

// Initialize Fabric network connection
async function initializeFabricNetwork() {
  try {
    // Load network configuration
    const networkConfigPath = process.env.FABRIC_NETWORK_CONFIG_PATH || '../fabric-network/connection-org1.json';
    const networkConfig = JSON.parse(fs.readFileSync(networkConfigPath, 'utf8'));

    // Create wallet
    const walletPath = process.env.FABRIC_WALLET_PATH || './wallet';
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if admin identity exists
    const adminExists = await wallet.get('admin');
    if (!adminExists) {
      logger.warn('Admin identity not found in wallet. Please enroll admin first.');
      return;
    }

    // Create gateway
    gateway = new Gateway();
    await gateway.connect(networkConfig, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get network and contract
    const channelName = process.env.FABRIC_CHANNEL_NAME || 'mychannel';
    network = await gateway.getNetwork(channelName);
    
    const chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'land-registry';
    contract = network.getContract(chaincodeName);

    logger.info('Fabric network initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Fabric network:', error);
    throw error;
  }
}

// Submit transaction to blockchain
async function submitTransaction(functionName, args) {
  try {
    if (!contract) {
      throw new Error('Fabric contract not initialized');
    }

    logger.info(`Submitting transaction: ${functionName} with args: ${args}`);
    
    const result = await contract.submitTransaction(functionName, args);
    
    logger.info(`Transaction submitted successfully: ${result.toString()}`);
    
    return result.toString();
  } catch (error) {
    logger.error(`Failed to submit transaction ${functionName}:`, error);
    throw error;
  }
}

// Evaluate transaction (query) on blockchain
async function evaluateTransaction(functionName, args) {
  try {
    if (!contract) {
      throw new Error('Fabric contract not initialized');
    }

    logger.info(`Evaluating transaction: ${functionName} with args: ${args}`);
    
    const result = await contract.evaluateTransaction(functionName, args);
    
    logger.info(`Transaction evaluated successfully: ${result.toString()}`);
    
    return result.toString();
  } catch (error) {
    logger.error(`Failed to evaluate transaction ${functionName}:`, error);
    throw error;
  }
}

// Verify deed on blockchain
async function verifyOnBlockchain(transactionHash) {
  try {
    if (!contract) {
      throw new Error('Fabric contract not initialized');
    }

    logger.info(`Verifying deed on blockchain with transaction hash: ${transactionHash}`);
    
    const result = await contract.evaluateTransaction('queryDeed', transactionHash);
    
    const deedData = JSON.parse(result.toString());
    
    logger.info('Deed verification completed successfully');
    
    return {
      verified: true,
      transactionHash,
      deedData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to verify deed on blockchain:', error);
    throw error;
  }
}

// Get deed history from blockchain
async function getDeedHistory(deedId) {
  try {
    if (!contract) {
      throw new Error('Fabric contract not initialized');
    }

    logger.info(`Getting deed history for deed ID: ${deedId}`);
    
    const result = await contract.evaluateTransaction('getDeedHistory', deedId);
    
    const history = JSON.parse(result.toString());
    
    logger.info('Deed history retrieved successfully');
    
    return history;
  } catch (error) {
    logger.error('Failed to get deed history:', error);
    throw error;
  }
}

// Transfer deed ownership
async function transferDeedOwnership(deedId, fromOwnerId, toOwnerId, transferReason) {
  try {
    if (!contract) {
      throw new Error('Fabric contract not initialized');
    }

    const transferData = {
      deedId,
      fromOwnerId,
      toOwnerId,
      transferReason,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Transferring deed ownership: ${JSON.stringify(transferData)}`);
    
    const result = await contract.submitTransaction('transferDeed', JSON.stringify(transferData));
    
    logger.info('Deed ownership transferred successfully');
    
    return result.toString();
  } catch (error) {
    logger.error('Failed to transfer deed ownership:', error);
    throw error;
  }
}

// Get network information
async function getNetworkInfo() {
  try {
    if (!network) {
      throw new Error('Fabric network not initialized');
    }

    const channel = network.getChannel();
    const info = await channel.queryInfo();
    
    return {
      height: info.height,
      currentBlockHash: info.currentBlockHash.toString('hex'),
      previousBlockHash: info.previousBlockHash.toString('hex'),
    };
  } catch (error) {
    logger.error('Failed to get network info:', error);
    throw error;
  }
}

// Close gateway connection
async function closeGateway() {
  try {
    if (gateway) {
      await gateway.disconnect();
      logger.info('Fabric gateway disconnected');
    }
  } catch (error) {
    logger.error('Failed to close gateway:', error);
    throw error;
  }
}

// Health check for Fabric network
async function checkFabricHealth() {
  try {
    if (!contract) {
      return {
        status: 'disconnected',
        message: 'Fabric contract not initialized',
      };
    }

    // Try a simple query to check connectivity
    await contract.evaluateTransaction('queryAllDeeds');
    
    return {
      status: 'connected',
      message: 'Fabric network is healthy',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Fabric health check failed:', error);
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  initializeFabricNetwork,
  submitTransaction,
  evaluateTransaction,
  verifyOnBlockchain,
  getDeedHistory,
  transferDeedOwnership,
  getNetworkInfo,
  closeGateway,
  checkFabricHealth,
};
