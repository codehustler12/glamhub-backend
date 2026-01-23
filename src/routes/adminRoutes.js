const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getArtists,
  getArtistDetails,
  approveArtist,
  rejectArtist,
  getDashboardStats
} = require('../controllers/adminController');
const { rejectArtistValidator } = require('../validators/adminValidator');

// Dashboard Stats
router.get('/dashboard/stats', protect, getDashboardStats);

// Artists Management
router.get('/artists', protect, getArtists);
router.get('/artists/:id', protect, getArtistDetails);
router.put('/artists/:id/approve', protect, approveArtist);
router.put('/artists/:id/reject', protect, rejectArtistValidator, rejectArtist);

module.exports = router;
