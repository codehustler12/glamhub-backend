const OTP = require('../models/OTP');
const User = require('../models/User');
const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');
const { sendOTPEmail } = require('../services/emailService');
const { sendOTPSMS, formatPhoneNumber } = require('../services/smsService');

// @desc    Send OTP to Email
// @route   POST /api/otp/send-email
// @access  Private (user must be logged in)
exports.sendEmailOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if there's a recent OTP (prevent spam)
    const recentOTP = await OTP.findOne({
      userId,
      type: 'email',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) } // 1 minute cooldown
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting another OTP'
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    const expiresAt = getOTPExpiry(10); // 10 minutes

    // Delete old OTPs for this user/type
    await OTP.deleteMany({ userId, type: 'email' });

    // Save new OTP
    await OTP.create({
      userId,
      otp,
      type: 'email',
      email,
      expiresAt
    });

    // Get user name for email
    const user = await User.findById(userId);
    const userName = user ? user.firstName : 'User';

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, userName);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to Phone
// @route   POST /api/otp/send-phone
// @access  Private
exports.sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone, countryCode = '+91' } = req.body;
    const userId = req.user.id;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const formattedPhone = formatPhoneNumber(phone, countryCode);

    // Check if there's a recent OTP (prevent spam)
    const recentOTP = await OTP.findOne({
      userId,
      type: 'phone',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting another OTP'
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    const expiresAt = getOTPExpiry(10);

    // Delete old OTPs
    await OTP.deleteMany({ userId, type: 'phone' });

    // Save new OTP
    await OTP.create({
      userId,
      otp,
      type: 'phone',
      phone: formattedPhone,
      expiresAt
    });

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(formattedPhone, otp);

    res.status(200).json({
      success: true,
      message: smsResult.development 
        ? 'SMS service not configured. Check console for OTP.' 
        : 'OTP sent to your phone',
      data: {
        phone: formattedPhone.replace(/(\+\d{2})(\d{3})(\d+)(\d{2})/, '$1 $2 **** $4'),
        expiresIn: '10 minutes',
        development: smsResult.development || false
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Private
exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp, type } = req.body; // type: 'email' or 'phone'
    const userId = req.user.id;

    if (!otp || !type) {
      return res.status(400).json({
        success: false,
        message: 'OTP and type are required'
      });
    }

    // Find the OTP
    const otpRecord = await OTP.findOne({
      userId,
      type,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        data: {
          attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts
        }
      });
    }

    // OTP is valid - update user verification status
    const updateField = type === 'email' 
      ? { isEmailVerified: true, email: otpRecord.email }
      : { isPhoneVerified: true, phone: otpRecord.phone };

    await User.findByIdAndUpdate(userId, updateField);

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'Phone'} verified successfully!`,
      data: {
        verified: true,
        type
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/otp/resend
// @access  Private
exports.resendOTP = async (req, res, next) => {
  try {
    const { type } = req.body; // 'email' or 'phone'
    const userId = req.user.id;

    if (!type || !['email', 'phone'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid type (email or phone) is required'
      });
    }

    // Find existing OTP to get email/phone
    const existingOTP = await OTP.findOne({ userId, type });
    
    if (!existingOTP) {
      return res.status(400).json({
        success: false,
        message: 'No previous OTP request found. Please start fresh.'
      });
    }

    // Check cooldown (1 minute)
    const timeSinceLastOTP = Date.now() - new Date(existingOTP.createdAt).getTime();
    if (timeSinceLastOTP < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - timeSinceLastOTP) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitTime} seconds before resending`
      });
    }

    // Generate new OTP
    const otp = generateOTP(6);
    const expiresAt = getOTPExpiry(10);

    // Update OTP record
    existingOTP.otp = otp;
    existingOTP.expiresAt = expiresAt;
    existingOTP.attempts = 0;
    existingOTP.createdAt = new Date();
    await existingOTP.save();

    // Send OTP
    if (type === 'email') {
      const user = await User.findById(userId);
      await sendOTPEmail(existingOTP.email, otp, user?.firstName || 'User');
    } else {
      await sendOTPSMS(existingOTP.phone, otp);
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP without login (for registration verification)
// @route   POST /api/otp/send-registration-otp
// @access  Public
exports.sendRegistrationOTP = async (req, res, next) => {
  try {
    const { email, phone, type } = req.body;

    if (type === 'email' && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (type === 'phone' && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check cooldown (using email/phone as identifier)
    const identifier = type === 'email' ? email : formatPhoneNumber(phone);
    const recentOTP = await OTP.findOne({
      [type]: identifier,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting another OTP'
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    const expiresAt = getOTPExpiry(10);

    // Delete old OTPs
    await OTP.deleteMany({ [type]: identifier, type });

    // Create temporary user ID for OTP storage
    const mongoose = require('mongoose');
    const tempUserId = new mongoose.Types.ObjectId();

    
    // Save OTP
    await OTP.create({
      userId: tempUserId,
      otp,
      type,
      [type]: identifier,
      expiresAt
    });

    // Send OTP
    if (type === 'email') {
      await sendOTPEmail(email, otp, 'User');
    } else {
      await sendOTPSMS(formatPhoneNumber(phone), otp);
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to your ${type}`,
      data: {
        expiresIn: '10 minutes',
        tempId: tempUserId // Frontend needs this for verification
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify registration OTP (without login)
// @route   POST /api/otp/verify-registration-otp
// @access  Public
exports.verifyRegistrationOTP = async (req, res, next) => {
  try {
    const { otp, type, email, phone, tempId } = req.body;

    if (!otp || !type) {
      return res.status(400).json({
        success: false,
        message: 'OTP and type are required'
      });
    }

    const identifier = type === 'email' ? email : formatPhoneNumber(phone);

    // Find OTP record
    const otpRecord = await OTP.findOne({
      [type]: identifier,
      type,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found'
      });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        data: { attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts }
      });
    }

    // Mark as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'Phone'} verified successfully!`,
      data: {
        verified: true,
        verificationToken: otpRecord._id // Use this to confirm during registration
      }
    });
  } catch (error) {
    next(error);
  }
};

