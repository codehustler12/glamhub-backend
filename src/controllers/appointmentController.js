const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// @desc    Get dashboard stats for artist
// @route   GET /api/artist/dashboard/stats
// @access  Private (Artist only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access dashboard stats'
      });
    }

    const artistId = req.user.id;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.appointmentDate = {};
      if (startDate) dateFilter.appointmentDate.$gte = new Date(startDate);
      if (endDate) dateFilter.appointmentDate.$lte = new Date(endDate);
    }

    // Get total revenue (from completed appointments)
    const revenueData = await Appointment.aggregate([
      {
        $match: {
          artistId: new mongoose.Types.ObjectId(artistId),
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Get upcoming appointments count
    const upcomingCount = await Appointment.countDocuments({
      artistId,
      status: { $in: ['pending', 'confirmed'] },
      appointmentDate: { $gte: new Date() }
    });

    // Get total clients (unique clients)
    const totalClients = await Appointment.distinct('clientId', {
      artistId
    });

    // Get average rating
    const Review = require('../models/Review');
    const ratingData = await Review.aggregate([
      {
        $match: {
          artistId: new mongoose.Types.ObjectId(artistId),
          isPublished: true
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const avgRating = ratingData.length > 0 ? ratingData[0].avgRating : 0;
    const totalReviews = ratingData.length > 0 ? ratingData[0].totalReviews : 0;

    // Calculate percentage change (mock for now - you can implement real comparison)
    const percentageChange = 12.5; // This would be calculated from previous period

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: {
          amount: totalRevenue,
          currency: 'AED',
          percentageChange: percentageChange
        },
        upcomingAppointments: {
          count: upcomingCount,
          percentageChange: percentageChange
        },
        totalClients: {
          count: totalClients.length,
          percentageChange: percentageChange
        },
        averageRating: {
          rating: parseFloat(avgRating.toFixed(2)),
          totalReviews: totalReviews,
          percentageChange: percentageChange
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments for artist
// @route   GET /api/artist/appointments
// @access  Private (Artist only)
exports.getAppointments = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view appointments'
      });
    }

    const artistId = req.user.id;
    const { status, serviceType, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = { artistId };
    if (status && status !== 'all') filter.status = status;
    if (serviceType && serviceType !== 'all') filter.serviceType = serviceType;
    
    if (startDate || endDate) {
      filter.appointmentDate = {};
      if (startDate) filter.appointmentDate.$gte = new Date(startDate);
      if (endDate) filter.appointmentDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('clientId', 'firstName lastName username email avatar')
      .populate('serviceId', 'serviceName serviceDescription')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        appointments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/artist/appointments/:id
// @access  Private (Artist only)
exports.getAppointment = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view appointments'
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('clientId', 'firstName lastName username email phone avatar')
      .populate('serviceId', 'serviceName serviceDescription price currency duration')
      .populate('artistId', 'firstName lastName username avatar');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check ownership
    if (appointment.artistId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this appointment'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        appointment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PUT /api/artist/appointments/:id/status
// @access  Private (Artist only)
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can update appointment status'
      });
    }

    const { status, cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check ownership
    if (appointment.artistId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    // Update status
    appointment.status = status;
    if (status === 'cancelled' && cancellationReason) {
      appointment.cancellationReason = cancellationReason;
      appointment.cancelledBy = 'artist';
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment status updated successfully',
      data: {
        appointment
      }
    });
  } catch (error) {
    next(error);
  }
};
