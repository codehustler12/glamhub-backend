const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Dashboard
const {
  getDashboardStats
} = require('../controllers/appointmentController');

// Appointments
const {
  getAppointments,
  getAppointment,
  updateAppointmentStatus
} = require('../controllers/appointmentController');
const { updateStatusValidator } = require('../validators/appointmentValidator');

// Reviews
const {
  getReviews,
  getReview
} = require('../controllers/reviewController');

// Dashboard Stats
router.get('/dashboard/stats', protect, getDashboardStats);

// Appointments
router.get('/appointments', protect, getAppointments);
router.get('/appointments/:id', protect, getAppointment);
router.put('/appointments/:id/status', protect, updateStatusValidator, updateAppointmentStatus);

// Reviews
router.get('/reviews', getReviews); // Can be public with artistId query
router.get('/reviews/:id', getReview);

module.exports = router;
