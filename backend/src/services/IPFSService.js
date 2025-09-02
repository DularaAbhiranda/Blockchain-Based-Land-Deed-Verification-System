// backend/src/services/IPFSService.js - IPFS integration for document storage
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Try to import ipfs-http-client dynamically to handle version differences
      const { create } = require('ipfs-http-client');
      
      const ipfsHost = process.env.IPFS_HOST || 'localhost';
      const ipfsPort = process.env.IPFS_PORT || 5001;
      const ipfsProtocol = process.env.IPFS_PROTOCOL || 'http';
      
      const ipfsUrl = `${ipfsProtocol}://${ipfsHost}:${ipfsPort}`;
      
      this.ipfs = create({ url: ipfsUrl });
      
      // Test connection
      const version = await this.ipfs.version();
      console.log(`✅ Connected to IPFS node version: ${version.version}`);
      
      this.initialized = true;
    } catch (error) {
      console.log('⚠️  IPFS service running in mock mode due to:', error.message);
      this.initialized = false;
    }
  }

  async uploadFile(filePath, metadata = {}) {
    try {
      if (!this.initialized) {
        // Mock implementation
        const mockHash = 'Qm' + crypto.randomBytes(32).toString('hex');
        return {
          hash: mockHash,
          size: fs.statSync(filePath).size,
          path: `/ipfs/${mockHash}`,
          mock: true
        };
      }

      const fileBuffer = fs.readFileSync(filePath);
      const result = await this.ipfs.add({
        path: path.basename(filePath),
        content: fileBuffer
      }, {
        pin: true,
        metadata: metadata
      });

      return {
        hash: result.cid.toString(),
        size: result.size,
        path: `/ipfs/${result.cid.toString()}`,
        mock: false
      };
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  async uploadBuffer(buffer, filename, metadata = {}) {
    try {
      if (!this.initialized) {
        // Mock implementation
        const mockHash = 'Qm' + crypto.randomBytes(32).toString('hex');
        return {
          hash: mockHash,
          size: buffer.length,
          path: `/ipfs/${mockHash}`,
          mock: true
        };
      }

      const result = await this.ipfs.add({
        path: filename,
        content: buffer
      }, {
        pin: true,
        metadata: metadata
      });

      return {
        hash: result.cid.toString(),
        size: result.size,
        path: `/ipfs/${result.cid.toString()}`,
        mock: false
      };
    } catch (error) {
      console.error('IPFS buffer upload failed:', error);
      throw error;
    }
  }

  async downloadFile(ipfsHash, outputPath) {
    try {
      if (!this.initialized) {
        throw new Error('IPFS not initialized - cannot download file');
      }

      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, fileBuffer);
      
      return {
        path: outputPath,
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('IPFS download failed:', error);
      throw error;
    }
  }

  async getFileBuffer(ipfsHash) {
    try {
      if (!this.initialized) {
        throw new Error('IPFS not initialized - cannot retrieve file');
      }

      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('IPFS get buffer failed:', error);
      throw error;
    }
  }

  async pinFile(ipfsHash) {
    try {
      if (!this.initialized) {
        console.log('IPFS not initialized - skipping pin operation');
        return { pinned: false, mock: true };
      }

      await this.ipfs.pin.add(ipfsHash);
      return { pinned: true, mock: false };
    } catch (error) {
      console.error('IPFS pin failed:', error);
      throw error;
    }
  }

  async unpinFile(ipfsHash) {
    try {
      if (!this.initialized) {
        console.log('IPFS not initialized - skipping unpin operation');
        return { unpinned: false, mock: true };
      }

      await this.ipfs.pin.rm(ipfsHash);
      return { unpinned: true, mock: false };
    } catch (error) {
      console.error('IPFS unpin failed:', error);
      throw error;
    }
  }

  async getFileInfo(ipfsHash) {
    try {
      if (!this.initialized) {
        return {
          hash: ipfsHash,
          size: 0,
          type: 'unknown',
          mock: true
        };
      }

      const stat = await this.ipfs.files.stat(`/ipfs/${ipfsHash}`);
      return {
        hash: ipfsHash,
        size: stat.size,
        type: stat.type,
        mock: false
      };
    } catch (error) {
      console.error('IPFS get file info failed:', error);
      throw error;
    }
  }

  generateHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  generateBufferHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'mock',
          message: 'IPFS running in mock mode',
          timestamp: new Date().toISOString()
        };
      }

      const version = await this.ipfs.version();
      return {
        status: 'healthy',
        version: version.version,
        message: 'IPFS node is operational',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new IPFSService();