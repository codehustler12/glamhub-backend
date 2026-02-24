const User = require('../models/User');
const Service = require('../models/Service');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const BlockedTime = require('../models/BlockedTime');
const mongoose = require('mongoose');

/** Parse time string to minutes since midnight. Supports "13:00", "01:00 PM", "16:00". */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const t = timeStr.trim();
  const m24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  const m12 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    if (m12[4].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m12[4].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }
  return null;
}

/** Parse duration string to minutes. Supports "2 hours", "30 minutes". */
function parseDurationToMinutes(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const d = durationStr.trim();
  const hMatch = d.match(/(\d+)\s*hour?s?/i);
  const mMatch = d.match(/(\d+)\s*min/i);
  let total = 0;
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

// @desc    Get all artists (Public - for explore page)
// @route   GET /api/artists
// @access  Public
exports.getArtists = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      city,
      serviceType,
      minPrice,
      maxPrice,
      search,
      sortBy = 'rating' // rating, price, newest
    } = req.query;

    // Build filter - only show active and approved artists
    const filter = {
      role: 'artist',
      isActive: true,
      approvalStatus: 'approved' // Only show approved artists to public
    };

    // City filter
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // Search filter (name, username, description)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get artists
    let artists = await User.find(filter)
      .select('firstName lastName username avatar city description portfolioImages createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(filter);

    // Get artist IDs
    const artistIds = artists.map(artist => artist._id);

    // Get ratings and review counts
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

    // Get min prices for each artist
    const priceStats = await Service.aggregate([
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

    // Create maps for quick lookup
    const ratingMap = {};
    reviewStats.forEach(stat => {
      ratingMap[stat._id.toString()] = {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalReviews: stat.totalReviews
      };
    });

    const priceMap = {};
    priceStats.forEach(stat => {
      priceMap[stat._id.toString()] = {
        minPrice: stat.minPrice,
        currency: stat.currency
      };
    });

    // Enhance artists with stats
    let enhancedArtists = artists.map(artist => {
      const artistIdStr = artist._id.toString();
      return {
        ...artist.toObject(),
        rating: ratingMap[artistIdStr]?.averageRating || 0,
        totalReviews: ratingMap[artistIdStr]?.totalReviews || 0,
        pricing: priceMap[artistIdStr] || null
      };
    });

    // Filter by service type and price range
    if (serviceType) {
      // This would require checking services, so we'll filter after getting services
      const artistsWithServiceType = await Service.distinct('artistId', {
        artistId: { $in: artistIds },
        serviceType: serviceType,
        isActive: true
      });
      const artistIdsWithService = new Set(artistsWithServiceType.map(id => id.toString()));
      enhancedArtists = enhancedArtists.filter(artist => artistIdsWithService.has(artist._id.toString()));
    }

    if (minPrice || maxPrice) {
      enhancedArtists = enhancedArtists.filter(artist => {
        if (!artist.pricing) return false;
        const price = artist.pricing.minPrice;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Sort
    if (sortBy === 'rating') {
      enhancedArtists.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      enhancedArtists.sort((a, b) => {
        const priceA = a.pricing?.minPrice || Infinity;
        const priceB = b.pricing?.minPrice || Infinity;
        return priceA - priceB;
      });
    } else if (sortBy === 'newest') {
      enhancedArtists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({
      success: true,
      count: enhancedArtists.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        artists: enhancedArtists
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single artist profile (Public)
// @route   GET /api/artists/:id
// @access  Public
exports.getArtistProfile = async (req, res, next) => {
  try {
    const artistId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID format'
      });
    }

    // Get artist - only active and approved artists
    const artist = await User.findOne({
      _id: artistId,
      role: 'artist',
      isActive: true,
      approvalStatus: 'approved' // Only show approved artists
    }).select('firstName lastName username email avatar city description portfolioImages hasStudio address createdAt');

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Get services
    const services = await Service.find({ artistId, isActive: true })
      .sort({ createdAt: -1 });

    // Get reviews with stats
    const reviews = await Review.find({ artistId, isPublished: true })
      .populate('clientId', 'firstName lastName username avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    const reviewStats = await Review.aggregate([
      {
        $match: {
          artistId: new mongoose.Types.ObjectId(artistId),
          isPublished: true
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          },
          avgProfessionalism: { $avg: '$categories.professionalism' },
          avgCommunication: { $avg: '$categories.communication' },
          avgPunctuality: { $avg: '$categories.punctuality' },
          avgValue: { $avg: '$categories.value' }
        }
      }
    ]);

    // Calculate rating distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviewStats.length > 0 && reviewStats[0].ratingDistribution) {
      reviewStats[0].ratingDistribution.forEach(rating => {
        const rounded = Math.round(rating);
        if (rounded >= 1 && rounded <= 5) {
          ratingDistribution[rounded]++;
        }
      });
    }

    const stats = reviewStats.length > 0 ? {
      averageRating: Math.round(reviewStats[0].averageRating * 10) / 10,
      totalReviews: reviewStats[0].totalReviews,
      ratingDistribution,
      categories: {
        professionalism: Math.round(reviewStats[0].avgProfessionalism * 10) / 10,
        communication: Math.round(reviewStats[0].avgCommunication * 10) / 10,
        punctuality: Math.round(reviewStats[0].avgPunctuality * 10) / 10,
        value: Math.round(reviewStats[0].avgValue * 10) / 10
      }
    } : {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution,
      categories: {
        professionalism: 0,
        communication: 0,
        punctuality: 0,
        value: 0
      }
    };

    // Get pricing info
    const pricingInfo = await Service.aggregate([
      {
        $match: {
          artistId: new mongoose.Types.ObjectId(artistId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          currency: { $first: '$currency' }
        }
      }
    ]);

    const pricing = pricingInfo.length > 0 ? {
      minPrice: pricingInfo[0].minPrice,
      maxPrice: pricingInfo[0].maxPrice,
      currency: pricingInfo[0].currency
    } : null;

    // Format artist response to match listing API format
    const artistData = {
      ...artist.toObject(),
      fullName: `${artist.firstName} ${artist.lastName}`,
      id: artist._id.toString(),
      stats: {
        rating: stats.averageRating,
        totalReviews: stats.totalReviews,
        ratingDistribution: stats.ratingDistribution,
        categories: stats.categories
      },
      pricing
    };

    res.status(200).json({
      success: true,
      data: {
        artist: artistData,
        services: services.map(service => ({
          ...service.toObject(),
          id: service._id.toString()
        })),
        reviews: reviews.map(review => ({
          ...review.toObject(),
          id: review._id.toString(),
          client: review.clientId
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check artist availability
// @route   GET /api/artists/:id/availability
// @access  Public
exports.checkAvailability = async (req, res, next) => {
  try {
    const artistId = req.params.id;
    const { date, time } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required (format: YYYY-MM-DD)'
      });
    }

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Check if artist exists
    const artist = await User.findById(artistId);
    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Check for existing appointments on this date
    const appointments = await Appointment.find({
      artistId,
      appointmentDate: {
        $gte: new Date(checkDate),
        $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Check for blocked time (any block overlapping this calendar day)
    const endOfCheckDate = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    const blockedTimesRaw = await BlockedTime.find({
      artistId,
      type: 'blocked_time',
      isActive: true,
      startDate: { $lte: endOfCheckDate },
      endDate: { $gte: checkDate }
    });

    // For same-day blocks with startTime/duration, only conflict if requested time falls inside the block
    const checkTimeMinutes = time ? timeToMinutes(time) : null;
    const checkDateStr = checkDate.toISOString().slice(0, 10);
    const blockedTimes = blockedTimesRaw.filter((block) => {
      const blockStartStr = block.startDate.toISOString().slice(0, 10);
      const blockEndStr = block.endDate.toISOString().slice(0, 10);
      const sameDay = blockStartStr === blockEndStr && blockStartStr === checkDateStr;
      if (sameDay && block.startTime && block.duration && checkTimeMinutes != null) {
        const blockStartMinutes = timeToMinutes(block.startTime);
        const blockDurationMinutes = parseDurationToMinutes(block.duration);
        if (blockStartMinutes == null) return true;
        const blockEndMinutes = blockStartMinutes + blockDurationMinutes;
        return checkTimeMinutes >= blockStartMinutes && checkTimeMinutes < blockEndMinutes;
      }
      if (sameDay && block.startTime && block.duration && checkTimeMinutes == null) {
        return false;
      }
      return true;
    });

    // Check for vacations
    const vacations = await BlockedTime.find({
      artistId,
      type: 'vacation',
      isActive: true,
      startDate: { $lte: checkDate },
      endDate: { $gte: checkDate }
    });

    const isAvailable = appointments.length === 0 && blockedTimes.length === 0 && vacations.length === 0;

    res.status(200).json({
      success: true,
      data: {
        date: date,
        time: time || null,
        available: isAvailable,
        conflicts: {
          appointments: appointments.length,
          blockedTime: blockedTimes.length,
          vacations: vacations.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
