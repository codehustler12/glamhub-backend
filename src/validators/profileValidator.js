const { body } = require('express-validator');

exports.updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),

  body('phone')
    .optional()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Please provide a valid phone number (10-15 digits)'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),

  // Artist profile fields
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('hasStudio')
    .optional()
    .isBoolean()
    .withMessage('hasStudio must be a boolean'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters')
];
