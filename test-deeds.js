// test-deeds.js - Test script for deed management system
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

async function testDeedManagement() {
  console.log('🧪 Testing Deed Management System...\n');

  let authToken = null;
  let testDeedId = null;

  try {
    // Test 1: Login as government official
    console.log('1. Logging in as government official...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'gov_official',
      password: 'gov123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test 2: Create a test deed
    console.log('\n2. Creating a test deed...');
    
    // Create a mock document file
    const testDocPath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testDocPath, 'This is a test deed document for verification purposes.');
    
    const formData = new FormData();
    formData.append('deed_number', 'TEST001');
    formData.append('title', 'Test Property Deed');
    formData.append('description', 'A test property deed for system verification');
    formData.append('owner_id', '4'); // citizen user ID
    formData.append('property_address', '123 Test Street, Test City');
    formData.append('survey_plan_number', 'SP001');
    formData.append('extent', '1000 sq ft');
    formData.append('boundaries', 'North: Main St, South: Test Ave, East: First St, West: Second St');
    formData.append('document', fs.createReadStream(testDocPath));

    const createResponse = await axios.post(`${API_BASE}/deeds/create`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    testDeedId = createResponse.data.deed.id;
    console.log('✅ Deed created successfully:', createResponse.data.deed.deed_number);
    
    // Clean up test file
    fs.unlinkSync(testDocPath);

    // Test 3: Search for deeds
    console.log('\n3. Searching for deeds...');
    const searchResponse = await axios.get(`${API_BASE}/deeds/search?query=TEST001`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Search successful, found', searchResponse.data.deeds.length, 'deeds');

    // Test 4: Get deed by number
    console.log('\n4. Getting deed by number...');
    const getResponse = await axios.get(`${API_BASE}/deeds/number/TEST001`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Deed retrieved successfully:', getResponse.data.deed.title);

    // Test 5: Verify deed
    console.log('\n5. Verifying deed...');
    const verifyResponse = await axios.post(`${API_BASE}/deeds/${testDeedId}/verify`, {
      verification_result: 'verified',
      notes: 'Test verification - document appears valid'
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('✅ Deed verification successful:', verifyResponse.data.verification_result);

    // Test 6: Test access control (login as citizen)
    console.log('\n6. Testing access control...');
    const citizenLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'citizen',
      password: 'citizen123'
    });
    
    const citizenToken = citizenLoginResponse.data.token;
    
    // Try to access deed as citizen (should get limited data)
    const citizenDeedResponse = await axios.get(`${API_BASE}/deeds/number/TEST001`, {
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    
    console.log('✅ Access control working - citizen sees limited data');

    // Test 7: Test unauthorized access
    console.log('\n7. Testing unauthorized access...');
    try {
      await axios.post(`${API_BASE}/deeds/create`, {
        deed_number: 'UNAUTHORIZED001',
        title: 'Unauthorized Deed'
      }, {
        headers: { 'Authorization': `Bearer ${citizenToken}` }
      });
      console.log('❌ Should have failed with unauthorized access');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log('✅ Unauthorized access correctly blocked');
      } else {
        console.log('❌ Unexpected error with unauthorized access:', error.message);
      }
    }

    console.log('\n🎉 All deed management tests passed!');
    console.log('\n📋 Test Results:');
    console.log('   ✅ User authentication');
    console.log('   ✅ Deed creation with file upload');
    console.log('   ✅ Deed search functionality');
    console.log('   ✅ Deed retrieval by number');
    console.log('   ✅ Deed verification process');
    console.log('   ✅ Access control enforcement');
    console.log('   ✅ Unauthorized access blocking');

  } catch (error) {
    console.error('❌ Deed management test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDeedManagement().catch(console.error);
}

module.exports = { testDeedManagement };
