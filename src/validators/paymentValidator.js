const { body } = require('express-validator');

exports.withdrawalValidator = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),

  body('bankDetails')
    .notEmpty()
    .withMessage('Bank details are required'),

  body('bankDetails.bankName')
    .notEmpty()
    .withMessage('Bank name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Bank name must be between 2 and 100 characters'),

  body('bankDetails.accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Account number must be between 5 and 50 characters'),

  body('bankDetails.iban')
    .optional()
    .trim()
    .isLength({ min: 15, max: 34 })
    .withMessage('IBAN must be between 15 and 34 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];
