const { body } = require('express-validator');

exports.registerValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters'),
  
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['user', 'artist'])
    .withMessage('Role must be either user or artist'),
  
  body('agreeToPrivacyPolicy')
    .optional()
    .isBoolean()
    .withMessage('agreeToPrivacyPolicy must be a boolean')
];

exports.loginValidator = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('username')
    .optional()
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('rememberMe must be a boolean')
];
