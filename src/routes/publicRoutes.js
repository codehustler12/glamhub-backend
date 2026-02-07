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

// Stripe config (publishable key for frontend - safe to expose)
router.get('/config/stripe', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || null;
  res.status(200).json({
    success: true,
    data: {
      publishableKey,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY
    }
  });
});

module.exports = router;
