const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get all reviews for artist
// @route   GET /api/artist/reviews
// @access  Private (Artist only) or Public (by artistId)
exports.getReviews = async (req, res, next) => {
  try {
    let artistId = req.user?.id;

    // If artistId query param is provided, get that artist's reviews (public)
    if (req.query.artistId) {
      artistId = req.query.artistId;
    } else if (!artistId) {
      return res.status(401).json({
        success: false,
        message: 'Please provide artistId or authenticate'
      });
    }

    const { page = 1, limit = 10, rating } = req.query;

    // Build filter
    const filter = { artistId, isPublished: true };
    if (rating) filter.rating = parseInt(rating);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate('clientId', 'firstName lastName username avatar')
      .populate('appointmentId', 'appointmentDate services')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    // Calculate average ratings by category
    const ratingStats = await Review.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          avgProfessionalism: { $avg: '$categories.professionalism' },
          avgCommunication: { $avg: '$categories.communication' },
          avgPunctuality: { $avg: '$categories.punctuality' },
          avgValue: { $avg: '$categories.value' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const stats = ratingStats.length > 0 ? {
      averageRating: parseFloat(ratingStats[0].avgRating.toFixed(2)),
      categories: {
        professionalism: parseFloat(ratingStats[0].avgProfessionalism.toFixed(1)),
        communication: parseFloat(ratingStats[0].avgCommunication.toFixed(1)),
        punctuality: parseFloat(ratingStats[0].avgPunctuality.toFixed(1)),
        value: parseFloat(ratingStats[0].avgValue.toFixed(1))
      },
      totalReviews: ratingStats[0].totalReviews
    } : {
      averageRating: 0,
      categories: {
        professionalism: 0,
        communication: 0,
        punctuality: 0,
        value: 0
      },
      totalReviews: 0
    };

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        reviews,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single review
// @route   GET /api/artist/reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('clientId', 'firstName lastName username avatar')
      .populate('artistId', 'firstName lastName username avatar')
      .populate('appointmentId', 'appointmentDate services');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
};
