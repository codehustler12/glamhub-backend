const express = require('express');
const router = express.Router();
const {
  getMyBookings,
  getBookingById,
  getMyReviews,
  createReview,
  getMyFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/clientController');
const { protect } = require('../middleware/auth');
const { createReviewValidator } = require('../validators/reviewValidator');

// Bookings routes
router.get('/bookings', protect, getMyBookings);
router.get('/bookings/:id', protect, getBookingById);

// Reviews routes
router.get('/reviews', protect, getMyReviews);
router.post('/reviews', protect, createReviewValidator, createReview);

// Favorites routes
router.get('/favorites', protect, getMyFavorites);
router.post('/favorites', protect, addFavorite);
router.delete('/favorites/:artistId', protect, removeFavorite);

module.exports = router;
