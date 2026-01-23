const User = require('../models/User');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Review = require('../models/Review');
const mongoose = require('mongoose');
const { sendArtistApprovalStatusEmail } = require('../services/emailService');

// @desc    Get all artists (with approval status filter)
// @route   GET /api/admin/artists
// @access  Private (Admin only)
exports.getArtists = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this resource'
      });
    }

    const { 
      approvalStatus, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { role: 'artist' };

    // Filter by approval status
    if (approvalStatus && approvalStatus !== 'all') {
      filter.approvalStatus = approvalStatus;
    }

    // Search filter (name, email, username, city)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get artists
    const artists = await User.find(filter)
      .select('firstName lastName username email phone avatar city description hasStudio address portfolioImages approvalStatus rejectionReason approvedAt approvedBy createdAt updatedAt')
      .populate('approvedBy', 'firstName lastName username')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await User.countDocuments(filter);

    // Format response
    const formattedArtists = artists.map(artist => ({
      _id: artist._id,
      id: artist._id.toString(),
      firstName: artist.firstName,
      lastName: artist.lastName,
      fullName: `${artist.firstName} ${artist.lastName}`,
      username: artist.username,
      email: artist.email,
      phone: artist.phone || '',
      avatar: artist.avatar || '',
      city: artist.city || '',
      description: artist.description || '',
      hasStudio: artist.hasStudio,
      address: artist.address || '',
      portfolioImages: artist.portfolioImages || [],
      approvalStatus: artist.approvalStatus,
      rejectionReason: artist.rejectionReason || '',
      approvedAt: artist.approvedAt,
      approvedBy: artist.approvedBy ? {
        _id: artist.approvedBy._id,
        firstName: artist.approvedBy.firstName,
        lastName: artist.approvedBy.lastName,
        username: artist.approvedBy.username
      } : null,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedArtists.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        artists: formattedArtists
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single artist details (for admin review)
// @route   GET /api/admin/artists/:id
// @access  Private (Admin only)
exports.getArtistDetails = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this resource'
      });
    }

    const artistId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID format'
      });
    }

    // Get artist (include role field to verify it's an artist)
    const artist = await User.findById(artistId)
      .select('firstName lastName username email phone avatar city description hasStudio address portfolioImages approvalStatus rejectionReason approvedAt approvedBy createdAt updatedAt role')
      .populate('approvedBy', 'firstName lastName username');

    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Get artist's services
    const services = await Service.find({ artistId, isActive: true })
      .select('serviceName serviceDescription serviceType price currency duration createdAt')
      .sort({ createdAt: -1 });

    // Get artist's stats
    const totalAppointments = await Appointment.countDocuments({ artistId });
    const completedAppointments = await Appointment.countDocuments({ 
      artistId, 
      status: 'completed' 
    });
    const totalReviews = await Review.countDocuments({ 
      artistId, 
      isPublished: true 
    });

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
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const averageRating = reviewStats.length > 0 
      ? Math.round(reviewStats[0].averageRating * 10) / 10 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        artist: {
          _id: artist._id,
          id: artist._id.toString(),
          firstName: artist.firstName,
          lastName: artist.lastName,
          fullName: `${artist.firstName} ${artist.lastName}`,
          username: artist.username,
          email: artist.email,
          phone: artist.phone || '',
          avatar: artist.avatar || '',
          city: artist.city || '',
          description: artist.description || '',
          hasStudio: artist.hasStudio,
          address: artist.address || '',
          portfolioImages: artist.portfolioImages || [],
          approvalStatus: artist.approvalStatus,
          rejectionReason: artist.rejectionReason || '',
          approvedAt: artist.approvedAt,
          approvedBy: artist.approvedBy ? {
            _id: artist.approvedBy._id,
            firstName: artist.approvedBy.firstName,
            lastName: artist.approvedBy.lastName,
            username: artist.approvedBy.username
          } : null,
          createdAt: artist.createdAt,
          updatedAt: artist.updatedAt
        },
        stats: {
          totalServices: services.length,
          totalAppointments,
          completedAppointments,
          totalReviews,
          averageRating
        },
        services
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve artist
// @route   PUT /api/admin/artists/:id/approve
// @access  Private (Admin only)
exports.approveArtist = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can approve artists'
      });
    }

    const artistId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID format'
      });
    }

    const artist = await User.findById(artistId);

    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    if (artist.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Artist is already approved'
      });
    }

    // Update approval status
    artist.approvalStatus = 'approved';
    artist.approvedAt = new Date();
    artist.approvedBy = req.user.id;
    artist.rejectionReason = ''; // Clear rejection reason if any
    await artist.save();

    // Send approval email to artist
    if (artist.email) {
      try {
        await sendArtistApprovalStatusEmail(
          artist.email,
          `${artist.firstName} ${artist.lastName}`,
          'approved'
        );
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Artist approved successfully',
      data: {
        artist: {
          _id: artist._id,
          firstName: artist.firstName,
          lastName: artist.lastName,
          username: artist.username,
          email: artist.email,
          approvalStatus: artist.approvalStatus,
          approvedAt: artist.approvedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject artist
// @route   PUT /api/admin/artists/:id/reject
// @access  Private (Admin only)
exports.rejectArtist = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reject artists'
      });
    }

    const { rejectionReason } = req.body;
    const artistId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid artist ID format'
      });
    }

    const artist = await User.findById(artistId);

    if (!artist || artist.role !== 'artist') {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    if (artist.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Artist is already rejected'
      });
    }

    // Update approval status
    artist.approvalStatus = 'rejected';
    artist.rejectionReason = rejectionReason || '';
    artist.approvedBy = req.user.id;
    await artist.save();

    // Send rejection email to artist
    if (artist.email) {
      try {
        await sendArtistApprovalStatusEmail(
          artist.email,
          `${artist.firstName} ${artist.lastName}`,
          'rejected',
          rejectionReason || ''
        );
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Artist rejected successfully',
      data: {
        artist: {
          _id: artist._id,
          firstName: artist.firstName,
          lastName: artist.lastName,
          username: artist.username,
          email: artist.email,
          approvalStatus: artist.approvalStatus,
          rejectionReason: artist.rejectionReason
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access dashboard stats'
      });
    }

    const totalArtists = await User.countDocuments({ role: 'artist' });
    const pendingArtists = await User.countDocuments({ 
      role: 'artist', 
      approvalStatus: 'pending' 
    });
    const approvedArtists = await User.countDocuments({ 
      role: 'artist', 
      approvalStatus: 'approved' 
    });
    const rejectedArtists = await User.countDocuments({ 
      role: 'artist', 
      approvalStatus: 'rejected' 
    });
    const totalClients = await User.countDocuments({ role: 'user' });
    const totalAppointments = await Appointment.countDocuments({});
    const totalServices = await Service.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        artists: {
          total: totalArtists,
          pending: pendingArtists,
          approved: approvedArtists,
          rejected: rejectedArtists
        },
        clients: {
          total: totalClients
        },
        appointments: {
          total: totalAppointments
        },
        services: {
          total: totalServices
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
