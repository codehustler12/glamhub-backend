const express = require('express');
const router = express.Router();
const {
  getMyBookings,
  getBookingById,
  createBooking,
  prepareBookingPayment,
  confirmBookingAfterPayment,
  cancelBooking,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/clientController');
const {
  processPayment,
  getPaymentIntentStatus,
  requestRefund
} = require('../controllers/paymentController');
const {
  sendMessage,
  getConversations,
  getMessagesWithUser,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { createReviewValidator, updateReviewValidator } = require('../validators/reviewValidator');
const { createBookingValidator, confirmBookingPaymentValidator, processPaymentValidator, requestRefundValidator, cancelBookingValidator } = require('../validators/appointmentValidator');
const { sendMessageValidator } = require('../validators/messageValidator');

// Bookings routes (specific paths before :id)
router.get('/bookings', protect, getMyBookings);
router.post('/bookings/prepare-payment', protect, createBookingValidator, prepareBookingPayment);
router.post('/bookings/confirm-payment', protect, confirmBookingPaymentValidator, confirmBookingAfterPayment);
router.get('/bookings/:id', protect, getBookingById);
router.post('/bookings', protect, createBookingValidator, createBooking);
router.put('/bookings/:id/cancel', protect, cancelBookingValidator, cancelBooking);

// Reviews routes
router.get('/reviews', protect, getMyReviews);
router.post('/reviews', protect, createReviewValidator, createReview);
router.put('/reviews/:id', protect, updateReviewValidator, updateReview);
router.delete('/reviews/:id', protect, deleteReview);

// Favorites routes
router.get('/favorites', protect, getMyFavorites);
router.post('/favorites', protect, addFavorite);
router.delete('/favorites/:artistId', protect, removeFavorite);

// Payment routes
router.post('/payments/process', protect, processPaymentValidator, processPayment);
router.get('/payments/intent/:paymentIntentId', protect, getPaymentIntentStatus);
router.post('/payments/refund', protect, requestRefundValidator, requestRefund);

// Message routes
router.post('/messages', protect, sendMessageValidator, sendMessage);
router.get('/messages/conversations', protect, getConversations);
router.get('/messages/with/:userId', protect, getMessagesWithUser);
router.get('/messages/:appointmentId', protect, getMessages);
router.put('/messages/:appointmentId/read', protect, markAsRead);

module.exports = router;
