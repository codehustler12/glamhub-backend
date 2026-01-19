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

// Messages
const {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { sendMessageValidator } = require('../validators/messageValidator');

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

// Message routes
router.post('/messages', protect, sendMessageValidator, sendMessage);
router.get('/messages/conversations', protect, getConversations);
router.get('/messages/:appointmentId', protect, getMessages);
router.put('/messages/:appointmentId/read', protect, markAsRead);

module.exports = router;
