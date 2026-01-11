const express = require('express');
const router = express.Router();
const {
  sendEmailOTP,
  sendPhoneOTP,
  verifyOTP,
  resendOTP,
  sendRegistrationOTP,
  verifyRegistrationOTP
} = require('../controllers/otpController');
const { protect } = require('../middleware/auth');

// Public routes (for registration flow)
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Protected routes (user must be logged in)
router.post('/send-email', protect, sendEmailOTP);
router.post('/send-phone', protect, sendPhoneOTP);
router.post('/verify', protect, verifyOTP);
router.post('/resend', protect, resendOTP);

module.exports = router;

