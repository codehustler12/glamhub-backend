const express = require('express');
const router = express.Router();
const {
  createService,
  getMyServices,
  getService,
  updateService,
  deleteService,
  getServicesByArtist
} = require('../controllers/serviceController');
const { protect } = require('../middleware/auth');
const {
  createServiceValidator,
  updateServiceValidator
} = require('../validators/serviceValidator');

// Public route
router.get('/artist/:artistId', getServicesByArtist);

// Protected routes (Artist only)
router.post('/', protect, createServiceValidator, createService);
router.get('/', protect, getMyServices);
router.get('/:id', protect, getService);
router.put('/:id', protect, updateServiceValidator, updateService);
router.delete('/:id', protect, deleteService);

module.exports = router;
