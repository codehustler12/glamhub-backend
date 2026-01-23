const { body, param } = require('express-validator');

exports.rejectArtistValidator = [
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters')
];
