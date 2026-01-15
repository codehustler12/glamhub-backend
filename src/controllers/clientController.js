const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const User = require('../models/User');
const Service = require('../models/Service');
const { validationResult } = require('express-validator');

// ============================================
// BOOKINGS CONTROLLERS
// ============================================

// @desc    Get client's bookings
// @route   GET /api/client/bookings
// @access  Private (Client only)
exports.getMyBookings = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access bookings'
      });
    }

    const clientId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = { clientId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get bookings with artist and service details
    const appointments = await Appointment.find(filter)
      .populate('artistId', 'firstName lastName username avatar city description portfolioImages')
      .populate('serviceId', 'serviceName serviceType price currency')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        bookings: appointments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/client/bookings/:id
// @access  Private (Client only - owner)
exports.getBookingById = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access bookings'
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('artistId', 'firstName lastName username avatar city description portfolioImages')
      .populate('serviceId', 'serviceName serviceDescription serviceType price currency duration');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check ownership
    if (appointment.clientId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        booking: appointment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new booking
// @route   POST /api/client/bookings
// @access  Private (Client only)
exports.createBooking = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can create bookings'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    const {
      artistId,
      serviceIds, // Array of service IDs
      appointmentDate,
      appointmentTime,
      venue,
      venueDetails,
      paymentMethod,
      notes
    } = req.body;

    const clientId = req.user.id;

    // Verify artist exists
    const artist = await User.findById(artistId);
    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Verify services exist and belong to the artist
    const services = await Service.find({
      _id: { $in: serviceIds },
      artistId,
      isActive: true
    });

    if (services.length !== serviceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more services not found or inactive'
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const serviceFee = 150; // Fixed service fee (can be made configurable)
    
    services.forEach(service => {
      totalAmount += service.price;
    });

    totalAmount += serviceFee;

    // Prepare services array for appointment
    const servicesArray = services.map(service => ({
      serviceId: service._id,
      serviceName: service.serviceName,
      price: service.price,
      currency: service.currency
    }));

    // Use first service's details for main serviceId and serviceType
    const primaryService = services[0];

    // Create appointment
    const appointment = await Appointment.create({
      artistId,
      clientId,
      serviceId: primaryService._id,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      venue: venue || 'artist_studio',
      venueDetails: venueDetails || {},
      paymentMethod: paymentMethod || 'pay_at_venue',
      paymentStatus: paymentMethod === 'pay_now' ? 'pending' : 'pending',
      services: servicesArray,
      totalAmount,
      serviceFee,
      currency: primaryService.currency,
      serviceType: primaryService.serviceType,
      notes: notes || '',
      status: 'pending'
    });

    // If payment method is 'pay_now', create payment intent (only if Stripe is configured)
    let paymentIntent = null;
    if (paymentMethod === 'pay_now') {
      try {
        const { createPaymentIntent } = require('../services/stripeService');
        const paymentResult = await createPaymentIntent(
          totalAmount,
          primaryService.currency,
          appointment._id,
          clientId,
          artistId
        );

        if (paymentResult.success) {
          paymentIntent = {
            clientSecret: paymentResult.clientSecret,
            paymentIntentId: paymentResult.paymentIntentId
          };
        } else {
          // Stripe not configured - return warning but still create booking
          console.warn('Stripe not configured. Booking created but payment cannot be processed online.');
        }
      } catch (error) {
        // Stripe module not installed or not configured
        console.warn('Stripe service not available:', error.message);
        // Still create booking, but payment will need to be handled manually
      }
    }

    // Determine response message based on payment status
    let responseMessage = 'Booking created successfully';
    if (paymentMethod === 'pay_now' && !paymentIntent) {
      responseMessage = 'Booking created successfully. Payment integration pending - payment can be processed later when Stripe is configured.';
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        booking: appointment,
        paymentIntent: paymentIntent || null, // Only included if paymentMethod is 'pay_now' and Stripe is configured
        paymentPending: paymentMethod === 'pay_now' && !paymentIntent // Flag to indicate payment needs to be processed later
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// REVIEWS CONTROLLERS
// ============================================

// @desc    Get client's reviews
// @route   GET /api/client/reviews
// @access  Private (Client only)
exports.getMyReviews = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access reviews'
      });
    }

    const clientId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get reviews with artist details
    const reviews = await Review.find({ clientId })
      .populate('artistId', 'firstName lastName username avatar city description portfolioImages')
      .populate('appointmentId', 'appointmentDate serviceType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Review.countDocuments({ clientId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a review
// @route   POST /api/client/reviews
// @access  Private (Client only)
exports.createReview = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors.array()
      });
    }

    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can create reviews'
      });
    }

    const { artistId, appointmentId, rating, categories, comment } = req.body;
    const clientId = req.user.id;

    // Check if artist exists
    const artist = await User.findById(artistId);
    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // If appointmentId provided, verify it belongs to this client
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      if (appointment.clientId.toString() !== clientId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to review this appointment'
        });
      }
      if (appointment.artistId.toString() !== artistId) {
        return res.status(400).json({
          success: false,
          message: 'Appointment does not belong to this artist'
        });
      }

      // Check if review already exists for this appointment
      const existingReview = await Review.findOne({ appointmentId, clientId });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Review already exists for this appointment'
        });
      }
    }

    // Create review
    const review = await Review.create({
      artistId,
      clientId,
      appointmentId: appointmentId || null,
      rating,
      categories: categories || {},
      comment: comment || '',
      isVerified: !!appointmentId // Verified if linked to appointment
    });

    // Populate artist details
    await review.populate('artistId', 'firstName lastName username avatar');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// FAVORITES CONTROLLERS
// ============================================

// @desc    Get client's favorite artists
// @route   GET /api/client/favorites
// @access  Private (Client only)
exports.getMyFavorites = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can access favorites'
      });
    }

    const clientId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get favorites with artist details
    const favorites = await Favorite.find({ clientId })
      .populate('artistId', 'firstName lastName username avatar city description portfolioImages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get artist stats (ratings, reviews count)
    const artistIds = favorites.map(fav => fav.artistId._id);
    
    // Get average ratings and review counts
    const reviewStats = await Review.aggregate([
      {
        $match: {
          artistId: { $in: artistIds },
          isPublished: true
        }
      },
      {
        $group: {
          _id: '$artistId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const statsMap = {};
    reviewStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalReviews: stat.totalReviews
      };
    });

    // Get services for each artist (for "From $X" pricing)
    const servicesData = await Service.aggregate([
      {
        $match: {
          artistId: { $in: artistIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$artistId',
          minPrice: { $min: '$price' },
          currency: { $first: '$currency' }
        }
      }
    ]);

    const pricingMap = {};
    servicesData.forEach(price => {
      pricingMap[price._id.toString()] = {
        minPrice: price.minPrice,
        currency: price.currency
      };
    });

    // Enhance favorites with stats
    const enhancedFavorites = favorites.map(fav => {
      const artistIdStr = fav.artistId._id.toString();
      return {
        ...fav.toObject(),
        artist: {
          ...fav.artistId.toObject(),
          stats: statsMap[artistIdStr] || { averageRating: 0, totalReviews: 0 },
          pricing: pricingMap[artistIdStr] || null
        }
      };
    });

    const total = await Favorite.countDocuments({ clientId });

    res.status(200).json({
      success: true,
      count: enhancedFavorites.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        favorites: enhancedFavorites
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add artist to favorites
// @route   POST /api/client/favorites
// @access  Private (Client only)
exports.addFavorite = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can add favorites'
      });
    }

    const { artistId } = req.body;
    const clientId = req.user.id;

    if (!artistId) {
      return res.status(400).json({
        success: false,
        message: 'Artist ID is required'
      });
    }

    // Check if artist exists and is an artist
    const artist = await User.findById(artistId);
    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({ clientId, artistId });
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Artist already in favorites'
      });
    }

    // Create favorite
    const favorite = await Favorite.create({
      clientId,
      artistId
    });

    await favorite.populate('artistId', 'firstName lastName username avatar city description portfolioImages');

    res.status(201).json({
      success: true,
      message: 'Artist added to favorites',
      data: {
        favorite
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove artist from favorites
// @route   DELETE /api/client/favorites/:artistId
// @access  Private (Client only - owner)
exports.removeFavorite = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can remove favorites'
      });
    }

    const { artistId } = req.params;
    const clientId = req.user.id;

    const favorite = await Favorite.findOneAndDelete({
      clientId,
      artistId
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Artist removed from favorites',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
