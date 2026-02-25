const twilio = require('twilio');

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }
  return twilio(accountSid, authToken);
};

const getVerifyServiceSid = () => process.env.TWILIO_VERIFY_SERVICE_SID || null;

/**
 * Send OTP via Twilio Verify (recommended for UAE and other regions).
 * Twilio generates and sends the code; use checkOTPViaVerify to verify.
 */
const sendOTPViaVerify = async (phoneNumber) => {
  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();
  if (!client || !serviceSid) {
    return { success: false, error: 'Verify not configured', code: null };
  }
  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });
    console.log('Verify sent:', verification.sid);
    return { success: true, sid: verification.sid };
  } catch (error) {
    console.error('Verify send error:', error.message, '| Code:', error.code, '| To:', phoneNumber);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Check OTP via Twilio Verify. Call after user submits the code.
 */
const checkOTPViaVerify = async (phoneNumber, code) => {
  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();
  if (!client || !serviceSid) {
    return { success: false, status: 'not_configured' };
  }
  try {
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code: String(code).trim() });
    return { success: check.status === 'approved', status: check.status };
  } catch (error) {
    console.error('Verify check error:', error.message, '| Code:', error.code);
    return { success: false, status: error.code === 20404 ? 'expired_or_invalid' : 'error' };
  }
};

// Send OTP via SMS (Messages API - used when Verify Service SID is not set)
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

module.exports = {
  sendOTPSMS,
  sendOTPViaVerify,
  checkOTPViaVerify,
  getVerifyServiceSid,
  validatePhoneNumber,
  formatPhoneNumber,
  validatePhoneForSMS
};