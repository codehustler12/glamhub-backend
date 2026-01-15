const express = require('express');
const router = express.Router();
const {
  getArtists,
  getArtistProfile,
  checkAvailability
} = require('../controllers/publicController');

// Public routes - no authentication required
router.get('/artists', getArtists);
router.get('/artists/:id', getArtistProfile);
router.get('/artists/:id/availability', checkAvailability);

module.exports = router;
