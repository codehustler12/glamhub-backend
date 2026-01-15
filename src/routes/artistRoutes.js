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
  updateAppointmentStatus,
  createAppointment,
  createBlockedTime,
  getBlockedTime,
  deleteBlockedTime,
  createVacation,
  getVacations,
  deleteVacation,
  getClients
} = require('../controllers/appointmentController');
const {
  updateStatusValidator,
  createAppointmentValidator,
  createBlockedTimeValidator,
  createVacationValidator
} = require('../validators/appointmentValidator');

// Reviews
const {
  getReviews,
  getReview
} = require('../controllers/reviewController');

// Dashboard Stats
router.get('/dashboard/stats', protect, getDashboardStats);

// Clients (for selecting when creating appointment)
router.get('/clients', protect, getClients);

// Appointments
router.get('/appointments', protect, getAppointments);
router.get('/appointments/:id', protect, getAppointment);
router.post('/appointments', protect, createAppointmentValidator, createAppointment);
router.put('/appointments/:id/status', protect, updateStatusValidator, updateAppointmentStatus);

// Blocked Time
router.post('/blocked-time', protect, createBlockedTimeValidator, createBlockedTime);
router.get('/blocked-time', protect, getBlockedTime);
router.delete('/blocked-time/:id', protect, deleteBlockedTime);

// Vacations
router.post('/vacations', protect, createVacationValidator, createVacation);
router.get('/vacations', protect, getVacations);
router.delete('/vacations/:id', protect, deleteVacation);

// Reviews
router.get('/reviews', getReviews); // Can be public with artistId query
router.get('/reviews/:id', getReview);

module.exports = router;
