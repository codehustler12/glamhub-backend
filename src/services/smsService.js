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
    console.error('SMS sending error:', error.message, '| Code:', error.code, '| To:', phoneNumber);
    // Do not log the OTP (security). For 21408 see: https://www.twilio.com/docs/api/errors/21408
    return {
      success: false,
      error: error.message,
      code: error.code,
      development: false
    };
  }
};

// Verify phone number format (basic validation)
const validatePhoneNumber = (phone) => {
  // Should be in E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
};

// Format phone number to E.164 (no double country code)
const formatPhoneNumber = (phone, countryCode = '+91') => {
  const digitsOnly = phone.replace(/\D/g, '');
  const countryDigits = countryCode.replace(/\D/g, ''); // e.g. "971"

  let national = digitsOnly;
  // If phone already starts with country code, strip it so we don't get +971971...
  if (countryDigits && digitsOnly.startsWith(countryDigits)) {
    national = digitsOnly.slice(countryDigits.length);
  }
  return '+' + countryDigits + national;
};

/**
 * Returns { valid: boolean, error?: string } for SMS.
 * UAE (+971): only mobile numbers (50/52/54/55/56/58 + 7 digits) can receive SMS; landlines (4xxx xxxx) cannot.
 */
const validatePhoneForSMS = (e164Number) => {
  const digits = e164Number.replace(/\D/g, '');
  if (digits.startsWith('971')) {
    const national = digits.slice(3);
    // UAE landline: Dubai 4 + 7 digits = 8 digits total. Twilio cannot send SMS to landlines.
    if (national.length === 8 && national.startsWith('4')) {
      return {
        valid: false,
        error: 'SMS cannot be sent to Dubai landline numbers. Please use a UAE mobile number (e.g. 50, 52, 55, 56).'
      };
    }
    // UAE mobile: 9 digits, typically starting with 50, 52, 54, 55, 56, 58
    if (national.length !== 9) {
      return {
        valid: false,
        error: 'Invalid UAE mobile number. Use 9 digits after +971 (e.g. 501234567).'
      };
    }
  }
  return { valid: true };
};

module.exports = { sendOTPSMS, validatePhoneNumber, formatPhoneNumber, validatePhoneForSMS };