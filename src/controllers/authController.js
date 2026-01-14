const User = require('../models/User');
const { validationResult } = require('express-validator');
const sendToken = require('../utils/sendToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { 
      firstName, 
      lastName, 
      username, 
      email,
      password, 
      role,
      agreeToPrivacyPolicy 
    } = req.body;

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      role: role || 'user',
      agreeToPrivacyPolicy: agreeToPrivacyPolicy || false
    });

    // Send token response
    sendToken(user, 201, res, 'Account created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user (supports both email and username)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const { email, username, password, rememberMe } = req.body;

    // Find user by email OR username
    let user;
    if (email) {
      user = await User.findOne({ email }).select('+password');
    } else if (username) {
      user = await User.findOne({ username }).select('+password');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or username'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send token response (with extended expiry if rememberMe is true)
    sendToken(user, 200, res, 'Login successful', rememberMe);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      avatar: req.body.avatar,
      email: req.body.email,
      // Artist profile fields
      city: req.body.city,
      description: req.body.description,
      hasStudio: req.body.hasStudio,
      address: req.body.address
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    sendToken(user, 200, res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Send OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.'
      });
    }

    // Import OTP utilities
    const OTP = require('../models/OTP');
    const { generateOTP, getOTPExpiry } = require('../utils/generateOTP');
    const { sendOTPEmail } = require('../services/emailService');

    // Check if there's a recent OTP (prevent spam)
    const recentOTP = await OTP.findOne({
      userId: user._id,
      type: 'password_reset',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) } // 1 minute cooldown
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting another code'
      });
    }

    // Generate 4-digit OTP (as shown in UI)
    const otp = generateOTP(4);
    const expiresAt = getOTPExpiry(10); // 10 minutes

    // Delete old password reset OTPs for this user
    await OTP.deleteMany({ userId: user._id, type: 'password_reset' });

    // Save new OTP
    await OTP.create({
      userId: user._id,
      otp,
      type: 'password_reset',
      email: user.email,
      expiresAt
    });

    // Send OTP via email
    const userName = user.firstName || 'User';
    const emailResult = await sendOTPEmail(user.email, otp, userName);

    if (!emailResult.success) {
      // Still return success to not reveal if user exists
      console.error('Failed to send password reset OTP:', emailResult.error);
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Import OTP model
    const OTP = require('../models/OTP');

    // Find the OTP record
    const otpRecord = await OTP.findOne({
      userId: user._id,
      type: 'password_reset',
      email: user.email,
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

    // OTP is valid - set new password
    user.password = password;
    await user.save();

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    sendToken(user, 200, res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Check if username is available
// @route   GET /api/auth/check-username/:username
// @access  Public
exports.checkUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ username });
    
    res.status(200).json({
      success: true,
      data: {
        available: !existingUser
      }
    });
  } catch (error) {
    next(error);
  }
};
