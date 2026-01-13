const express = require('express');
const router = express.Router();
const {
  uploadPortfolioImages,
  getPortfolioImages,
  deletePortfolioImage
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');
const { uploadPortfolioImages: uploadMiddleware } = require('../middleware/upload');
const errorHandler = require('../middleware/errorHandler');

// Public route (get portfolio by artistId)
router.get('/', getPortfolioImages);

// Protected routes (Artist only)
router.post('/upload', protect, uploadMiddleware, uploadPortfolioImages);
router.delete('/:imageUrl', protect, deletePortfolioImage);

// Error handler for multer errors
router.use(errorHandler);

module.exports = router;
