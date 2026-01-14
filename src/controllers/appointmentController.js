const Appointment = require('../models/Appointment');
const BlockedTime = require('../models/BlockedTime');
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
          artistId: mongoose.Types.ObjectId.isValid(artistId) ? new mongoose.Types.ObjectId(artistId) : artistId,
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
          artistId: mongoose.Types.ObjectId.isValid(artistId) ? new mongoose.Types.ObjectId(artistId) : artistId,
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

// @desc    Create appointment (Artist manually)
// @route   POST /api/artist/appointments
// @access  Private (Artist only)
exports.createAppointment = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create appointments'
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
      clientId,
      serviceIds,
      appointmentDate,
      appointmentTime,
      venue,
      venueDetails,
      paymentMethod,
      notes
    } = req.body;

    const artistId = req.user.id;

    // Verify client exists
    const client = await User.findById(clientId);
    if (!client || client.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
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
    const serviceFee = 150; // Fixed service fee
    
    services.forEach(service => {
      totalAmount += service.price;
    });

    totalAmount += serviceFee;

    // Prepare services array for appointment
    const servicesArray = services.map(service => ({
      serviceId: service._id,
      serviceName: service.serviceName,
      price: service.price,
      currency: service.currency,
      duration: service.duration
    }));

    const primaryService = services[0];

    // Create appointment
    const appointment = await Appointment.create({
      artistId,
      clientId,
      serviceId: primaryService._id,
      services: servicesArray,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      venue: venue || 'artist_studio',
      venueDetails: venueDetails || {},
      paymentMethod: paymentMethod || 'pay_at_venue',
      totalAmount,
      currency: primaryService.currency,
      serviceType: primaryService.serviceType,
      status: 'confirmed', // Artist-created appointments are auto-confirmed
      notes: notes || ''
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('clientId', 'firstName lastName username email avatar')
      .populate('serviceId', 'serviceName serviceDescription')
      .populate('artistId', 'firstName lastName username avatar');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment: populatedAppointment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create blocked time
// @route   POST /api/artist/blocked-time
// @access  Private (Artist only)
exports.createBlockedTime = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can block time'
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

    const { startDate, endDate, startTime, duration, reason } = req.body;
    const artistId = req.user.id;

    // For blocked time, if endDate is same as startDate, use startTime and duration
    let finalStartDate = new Date(startDate);
    let finalEndDate = new Date(endDate);

    // If same day and has startTime/duration, calculate endDate
    if (startTime && duration && startDate === endDate) {
      // Parse duration (e.g., "3 hours" -> 3)
      const hours = parseInt(duration.match(/\d+/)?.[0] || '0');
      finalEndDate = new Date(finalStartDate);
      finalEndDate.setHours(finalEndDate.getHours() + hours);
    }

    const blockedTime = await BlockedTime.create({
      artistId,
      type: 'blocked_time',
      startDate: finalStartDate,
      endDate: finalEndDate,
      startTime: startTime || null,
      duration: duration || null,
      reason: reason || ''
    });

    res.status(201).json({
      success: true,
      message: 'Time blocked successfully',
      data: {
        blockedTime
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blocked time slots
// @route   GET /api/artist/blocked-time
// @access  Private (Artist only)
exports.getBlockedTime = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view blocked time'
      });
    }

    const artistId = req.user.id;
    const { startDate, endDate } = req.query;

    const filter = {
      artistId,
      type: 'blocked_time',
      isActive: true
    };

    if (startDate || endDate) {
      filter.$or = [];
      if (startDate) {
        filter.$or.push({ startDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        filter.$or.push({ endDate: { $lte: new Date(endDate) } });
      }
    }

    const blockedTimes = await BlockedTime.find(filter)
      .sort({ startDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: blockedTimes.length,
      data: {
        blockedTimes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete blocked time
// @route   DELETE /api/artist/blocked-time/:id
// @access  Private (Artist only)
exports.deleteBlockedTime = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can delete blocked time'
      });
    }

    const blockedTime = await BlockedTime.findById(req.params.id);

    if (!blockedTime) {
      return res.status(404).json({
        success: false,
        message: 'Blocked time not found'
      });
    }

    if (blockedTime.artistId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blocked time'
      });
    }

    await BlockedTime.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Blocked time deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create vacation
// @route   POST /api/artist/vacations
// @access  Private (Artist only)
exports.createVacation = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create vacations'
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

    const { startDate, endDate, reason } = req.body;
    const artistId = req.user.id;

    const vacation = await BlockedTime.create({
      artistId,
      type: 'vacation',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || ''
    });

    res.status(201).json({
      success: true,
      message: 'Vacation added successfully',
      data: {
        vacation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vacations
// @route   GET /api/artist/vacations
// @access  Private (Artist only)
exports.getVacations = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view vacations'
      });
    }

    const artistId = req.user.id;
    const { startDate, endDate } = req.query;

    const filter = {
      artistId,
      type: 'vacation',
      isActive: true
    };

    if (startDate || endDate) {
      filter.$or = [];
      if (startDate) {
        filter.$or.push({ startDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        filter.$or.push({ endDate: { $lte: new Date(endDate) } });
      }
    }

    const vacations = await BlockedTime.find(filter)
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      count: vacations.length,
      data: {
        vacations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vacation
// @route   DELETE /api/artist/vacations/:id
// @access  Private (Artist only)
exports.deleteVacation = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can delete vacations'
      });
    }

    const vacation = await BlockedTime.findById(req.params.id);

    if (!vacation) {
      return res.status(404).json({
        success: false,
        message: 'Vacation not found'
      });
    }

    if (vacation.artistId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this vacation'
      });
    }

    if (vacation.type !== 'vacation') {
      return res.status(400).json({
        success: false,
        message: 'This is not a vacation record'
      });
    }

    await BlockedTime.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Vacation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
