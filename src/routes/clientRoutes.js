const express = require('express');
const router = express.Router();
const {
  getMyBookings,
  getBookingById,
  createBooking,
  getMyReviews,
  createReview,
  getMyFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/clientController');
const {
  processPayment,
  getPaymentIntentStatus,
  requestRefund
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { createReviewValidator } = require('../validators/reviewValidator');
const { createBookingValidator, processPaymentValidator, requestRefundValidator } = require('../validators/appointmentValidator');

// Bookings routes
router.get('/bookings', protect, getMyBookings);
router.get('/bookings/:id', protect, getBookingById);
router.post('/bookings', protect, createBookingValidator, createBooking);

// Reviews routes
router.get('/reviews', protect, getMyReviews);
router.post('/reviews', protect, createReviewValidator, createReview);

// Favorites routes
router.get('/favorites', protect, getMyFavorites);
router.post('/favorites', protect, addFavorite);
router.delete('/favorites/:artistId', protect, removeFavorite);

// Payment routes
router.post('/payments/process', protect, processPaymentValidator, processPayment);
router.get('/payments/intent/:paymentIntentId', protect, getPaymentIntentStatus);
router.post('/payments/refund', protect, requestRefundValidator, requestRefund);

module.exports = router;
