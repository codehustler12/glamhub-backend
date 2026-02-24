const { body } = require('express-validator');

exports.createServiceValidator = [
  body('serviceName')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),

  body('serviceDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service description cannot exceed 200 characters'),

  body('serviceType')
    .notEmpty()
    .withMessage('Service type is required')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Service type must be between 1 and 50 characters'),

  body('priceType')
    .optional()
    .isIn(['fixed', 'hourly', 'per_person'])
    .withMessage('Price type must be one of: fixed, hourly, per_person'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('currency')
    .optional()
    .isIn(['AED', 'USD', 'EUR', 'INR', 'PKR'])
    .withMessage('Currency must be one of: AED, USD, EUR, INR, PKR')
    .toUpperCase(),

  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .trim()
    .matches(/^(\d+[hHmM]|[\d.]+[hHmM])$/)
    .withMessage('Duration must be in format like: 1h, 2h, 30m, 1.5h'),

  body('addOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),

  body('addOns.*.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Add-on name is required'),

  body('addOns.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Add-on price must be a positive number')
];

exports.updateServiceValidator = [
  body('serviceName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),

  body('serviceDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service description cannot exceed 200 characters'),

  body('serviceType')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Service type must be between 1 and 50 characters'),

  body('priceType')
    .optional()
    .isIn(['fixed', 'hourly', 'per_person'])
    .withMessage('Price type must be one of: fixed, hourly, per_person'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('currency')
    .optional()
    .isIn(['AED', 'USD', 'EUR', 'INR', 'PKR'])
    .withMessage('Currency must be one of: AED, USD, EUR, INR, PKR')
    .toUpperCase(),

  body('duration')
    .optional()
    .trim()
    .matches(/^(\d+[hHmM]|[\d.]+[hHmM])$/)
    .withMessage('Duration must be in format like: 1h, 2h, 30m, 1.5h'),

  body('addOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];
