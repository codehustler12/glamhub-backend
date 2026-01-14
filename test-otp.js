// Quick OTP Test Script
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://api.adwebtest.online/api';

async function testEmailOTP() {
  console.log('\n📧 Testing Email OTP...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/otp/send-registration-otp`, {
      type: 'email',
      email: 'test@example.com' // Change this to your email
    });
    
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ OTP sent successfully!');
      console.log('📬 Check your email inbox (and spam folder)');
      console.log('🔑 Temp ID:', response.data.data.tempId);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function testPhoneOTP() {
  console.log('\n📱 Testing Phone OTP...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/otp/send-registration-otp`, {
      type: 'phone',
      phone: '1234567890' // Change this to your phone
    });
    
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ OTP sent successfully!');
      console.log('📱 Check your phone for SMS');
      console.log('🔑 Temp ID:', response.data.data.tempId);
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run tests
console.log('🧪 OTP Testing Script\n');
console.log('='.repeat(50));

// Uncomment the test you want to run:
// testEmailOTP();
// testPhoneOTP();

console.log('\n💡 To use this script:');
console.log('1. Install axios: npm install axios');
console.log('2. Update email/phone in the script');
console.log('3. Uncomment the test function you want to run');
console.log('4. Run: node test-otp.js\n');
