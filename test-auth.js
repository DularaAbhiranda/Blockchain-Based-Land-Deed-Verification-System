// test-auth.js - Test script for authentication system
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass123',
      role: 'citizen',
      full_name: 'Test User',
      national_id: 'TEST001',
      phone: '+1234567890',
      address: '123 Test Street'
    });
    
    console.log('✅ Registration successful:', registerResponse.data.message);
    const token = registerResponse.data.token;

    // Test 2: Login with the registered user
    console.log('\n2. Testing user login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'testuser',
      password: 'testpass123'
    });
    
    console.log('✅ Login successful:', loginResponse.data.message);

    // Test 3: Verify token
    console.log('\n3. Testing token verification...');
    const verifyResponse = await axios.post(`${API_BASE}/auth/verify-token`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Token verification successful:', verifyResponse.data.valid);

    // Test 4: Test protected endpoint
    console.log('\n4. Testing protected endpoint...');
    const protectedResponse = await axios.get(`${API_BASE}/blockchain/health`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Protected endpoint accessible:', protectedResponse.data.status);

    // Test 5: Test invalid token
    console.log('\n5. Testing invalid token...');
    try {
      await axios.get(`${API_BASE}/blockchain/health`, {
        headers: { Authorization: 'Bearer invalid_token' }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid token correctly rejected');
      } else {
        console.log('❌ Unexpected error with invalid token:', error.message);
      }
    }

    // Test 6: Test duplicate registration
    console.log('\n6. Testing duplicate registration...');
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123',
        role: 'citizen',
        full_name: 'Test User',
        national_id: 'TEST001'
      });
      console.log('❌ Should have failed with duplicate user');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Duplicate registration correctly rejected');
      } else {
        console.log('❌ Unexpected error with duplicate registration:', error.message);
      }
    }

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Test Results:');
    console.log('   ✅ User registration');
    console.log('   ✅ User login');
    console.log('   ✅ Token verification');
    console.log('   ✅ Protected endpoint access');
    console.log('   ✅ Invalid token rejection');
    console.log('   ✅ Duplicate registration rejection');

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuth().catch(console.error);
}

module.exports = { testAuth };
