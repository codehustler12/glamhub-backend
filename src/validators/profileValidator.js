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
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // Remove +, spaces, dashes, parentheses for validation
      const cleaned = value.replace(/[\s+\-()]/g, '');
      // Check if it's 10-15 digits
      if (!/^[0-9]{10,15}$/.test(cleaned)) {
        throw new Error('Please provide a valid phone number (10-15 digits)');
      }
      return true;
    })
    .withMessage('Please provide a valid phone number (10-15 digits)'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('avatar')
    .optional()
    .custom((value) => {
      // Allow empty string
      if (!value || value.trim() === '') return true;
      
      // Check if it's a valid URL
      try {
        const url = new URL(value);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return true;
        }
      } catch (e) {
        // Not a URL, check if it's base64 image data
      }
      
      // Check if it's a base64 data URI (data:image/...;base64,...)
      if (value.startsWith('data:image/')) {
        const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/;
        if (base64Regex.test(value)) {
          // Check size (5MB limit for base64)
          const base64Data = value.split(',')[1];
          if (base64Data) {
            const sizeInBytes = (base64Data.length * 3) / 4;
            const sizeInMB = sizeInBytes / (1024 * 1024);
            if (sizeInMB > 5) {
              throw new Error('Avatar image size must be less than 5MB');
            }
          }
          return true;
        }
      }
      
      throw new Error('Avatar must be a valid URL or base64 image data (data:image/...;base64,...)');
    })
    .withMessage('Avatar must be a valid URL or base64 image data'),

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
