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

exports.createBookingValidator = [
  body('artistId')
    .notEmpty()
    .withMessage('Artist ID is required')
    .isMongoId()
    .withMessage('Invalid Artist ID format'),

  body('serviceIds')
    .isArray({ min: 1 })
    .withMessage('At least one service ID is required')
    .custom((serviceIds) => {
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        throw new Error('Service IDs must be a non-empty array');
      }
      return serviceIds.every(id => {
        const mongoose = require('mongoose');
        return mongoose.Types.ObjectId.isValid(id);
      });
    })
    .withMessage('All service IDs must be valid MongoDB ObjectIds'),

  body('appointmentDate')
    .notEmpty()
    .withMessage('Appointment date is required')
    .isISO8601()
    .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((date) => {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),

  body('appointmentTime')
    .notEmpty()
    .withMessage('Appointment time is required')
    .trim(),

  body('venue')
    .optional()
    .isIn(['artist_studio', 'client_venue'])
    .withMessage('Venue must be either artist_studio or client_venue'),

  body('venueDetails.venueName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Venue name cannot exceed 100 characters'),

  body('venueDetails.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),

  body('venueDetails.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('venueDetails.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['pay_at_venue', 'pay_now'])
    .withMessage('Payment method must be either pay_at_venue or pay_now'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

exports.processPaymentValidator = [
  body('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required')
    .isMongoId()
    .withMessage('Invalid Appointment ID format'),

  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment Intent ID is required')
    .trim()
];

exports.requestRefundValidator = [
  body('appointmentId')
    .notEmpty()
    .withMessage('Appointment ID is required')
    .isMongoId()
    .withMessage('Invalid Appointment ID format'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Validator for artist creating appointment manually
exports.createAppointmentValidator = [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Invalid Client ID format'),

  body('serviceIds')
    .isArray({ min: 1 })
    .withMessage('At least one service ID is required')
    .custom((serviceIds) => {
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        throw new Error('Service IDs must be a non-empty array');
      }
      return serviceIds.every(id => {
        const mongoose = require('mongoose');
        return mongoose.Types.ObjectId.isValid(id);
      });
    })
    .withMessage('All service IDs must be valid MongoDB ObjectIds'),

  body('appointmentDate')
    .notEmpty()
    .withMessage('Appointment date is required')
    .isISO8601()
    .withMessage('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'),

  body('appointmentTime')
    .notEmpty()
    .withMessage('Appointment time is required')
    .trim(),

  body('venue')
    .optional()
    .isIn(['artist_studio', 'client_venue'])
    .withMessage('Venue must be either artist_studio or client_venue'),

  body('venueDetails')
    .optional(),

  body('paymentMethod')
    .optional()
    .isIn(['pay_at_venue', 'pay_now'])
    .withMessage('Payment method must be either pay_at_venue or pay_now'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validator for blocking time
exports.createBlockedTimeValidator = [
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('startTime')
    .optional()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)?$/)
    .withMessage('Invalid time format. Use HH:MM or HH:MM AM/PM'),

  body('duration')
    .optional()
    .trim()
    .matches(/^\d+\s*(hour|hours|hr|hrs)$/i)
    .withMessage('Duration must be in format like "3 hours" or "2 hours"'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// Validator for creating vacation
exports.createVacationValidator = [
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format. Use ISO 8601 format (YYYY-MM-DD)'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];
