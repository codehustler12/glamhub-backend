const { body, param } = require('express-validator');

exports.updateStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'rejected'])
    .withMessage('Status must be one of: pending, confirmed, completed, cancelled, rejected'),

  body('cancellationReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters')
];
