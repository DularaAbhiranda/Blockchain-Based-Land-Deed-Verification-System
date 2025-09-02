// test-setup.js - Test script to verify system setup
const axios = require('axios');

const SERVICES = {
  backend: 'http://localhost:3001',
  frontend: 'http://localhost:3000',
  ipfs: 'http://localhost:8080',
  postgres: 'localhost:5432'
};

async function testService(url, name) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    console.log(`✅ ${name}: ${response.status} - ${response.statusText}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testBackendHealth() {
  try {
    const response = await axios.get(`${SERVICES.backend}/health`, { timeout: 5000 });
    console.log(`✅ Backend Health: ${response.data.status}`);
    return true;
  } catch (error) {
    console.log(`❌ Backend Health: ${error.message}`);
    return false;
  }
}

async function testBlockchainService() {
  try {
    const response = await axios.get(`${SERVICES.backend}/api/blockchain/health`, { timeout: 5000 });
    console.log(`✅ Blockchain Service: ${response.data.blockchain} mode`);
    return true;
  } catch (error) {
    console.log(`❌ Blockchain Service: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Blockchain Land Registry Setup...\n');

  const results = {
    backend: await testService(SERVICES.backend, 'Backend API'),
    frontend: await testService(SERVICES.frontend, 'Frontend'),
    ipfs: await testService(SERVICES.ipfs, 'IPFS Gateway'),
    backendHealth: await testBackendHealth(),
    blockchain: await testBlockchainService()
  };

  console.log('\n📊 Test Results:');
  console.log('================');
  
  Object.entries(results).forEach(([service, status]) => {
    const icon = status ? '✅' : '❌';
    console.log(`${icon} ${service}: ${status ? 'PASS' : 'FAIL'}`);
  });

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! Your system is ready for development.');
  } else {
    console.log('⚠️  Some tests failed. Please check the service logs.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
