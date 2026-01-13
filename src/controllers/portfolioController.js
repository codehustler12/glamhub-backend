const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Upload portfolio images
// @route   POST /api/portfolio/upload
// @access  Private (Artist only)
exports.uploadPortfolioImages = async (req, res, next) => {
  try {
    // Check if user is an artist
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can upload portfolio images'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image'
      });
    }

    // Get image URLs (in production, upload to cloud storage like AWS S3, Cloudinary, etc.)
    // For now, we'll store relative paths
    const imageUrls = req.files.map(file => {
      // In production, return full URL from cloud storage
      // For now, return relative path
      return `/uploads/portfolio/${file.filename}`;
    });

    // Update user's portfolio images
    const user = await User.findById(req.user.id);
    user.portfolioImages = [...user.portfolioImages, ...imageUrls];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio images uploaded successfully',
      data: {
        images: imageUrls,
        totalImages: user.portfolioImages.length
      }
    });
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../../', file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    next(error);
  }
};

// @desc    Get portfolio images
// @route   GET /api/portfolio
// @access  Private (Artist only) or Public (by artistId)
exports.getPortfolioImages = async (req, res, next) => {
  try {
    let userId = req.user?.id;

    // If artistId query param is provided, get that artist's portfolio (public)
    if (req.query.artistId) {
      userId = req.query.artistId;
    } else if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please provide artistId or authenticate'
      });
    }

    const user = await User.findById(userId).select('portfolioImages firstName lastName username');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        artist: {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username
        },
        portfolioImages: user.portfolioImages || [],
        totalImages: user.portfolioImages?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete portfolio image
// @route   DELETE /api/portfolio/:imageUrl
// @access  Private (Artist only - owner)
exports.deletePortfolioImage = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can delete portfolio images'
      });
    }

    const imageUrl = decodeURIComponent(req.params.imageUrl);
    const user = await User.findById(req.user.id);

    if (!user.portfolioImages.includes(imageUrl)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in portfolio'
      });
    }

    // Remove image from array
    user.portfolioImages = user.portfolioImages.filter(img => img !== imageUrl);
    await user.save();

    // Delete file from server (in production, delete from cloud storage)
    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname, '../../uploads/portfolio/', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({
      success: true,
      message: 'Portfolio image deleted successfully',
      data: {
        remainingImages: user.portfolioImages.length
      }
    });
  } catch (error) {
    next(error);
  }
};
