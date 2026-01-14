const twilio = require('twilio');

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }
  
  return twilio(accountSid, authToken);
};

// Send OTP via SMS
const sendOTPSMS = async (phoneNumber, otp) => {
  try {
    const client = getTwilioClient();
    
    if (!client) {
      console.log('SMS Service not configured - OTP:', otp); // For development
      return {
        success: true,
        message: 'SMS service not configured. OTP logged to console.',
        development: true
      };
    }

    const message = await client.messages.create({
      body: `Your Glamhub verification code is: ${otp}. Valid for 10 minutes. Don't share this code with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('SMS sent:', message.sid);
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    // Log OTP to console for development/testing when SMS fails
    console.log('⚠️ SMS failed - OTP for', phoneNumber, 'is:', otp);
    return {
      success: false,
      error: error.message,
      development: true,
      otp: otp // Include OTP in response for development (remove in production)
    };
  }
};

// Verify phone number format (basic validation)
const validatePhoneNumber = (phone) => {
  // Should be in E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
};

// Format phone number to E.164
const formatPhoneNumber = (phone, countryCode = '+91') => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If doesn't start with country code, add it
  if (!phone.startsWith('+')) {
    cleaned = countryCode + cleaned;
  } else {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

module.exports = { sendOTPSMS, validatePhoneNumber, formatPhoneNumber };