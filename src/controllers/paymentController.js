const Transaction = require('../models/Transaction');
const Appointment = require('../models/Appointment');
const { validationResult } = require('express-validator');

// @desc    Get payment dashboard stats
// @route   GET /api/artist/payments/stats
// @access  Private (Artist only)
exports.getPaymentStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access payment stats'
      });
    }

    const artistId = req.user.id;
    const { period = 'all' } = req.query;

    // Build date filter based on period
    const dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      if (period === 'month') {
        dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      } else if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.createdAt = { $gte: weekAgo };
      }
    }

    // Get available balance (succeeded deposits - succeeded withdrawals)
    const balanceData = await Transaction.aggregate([
      {
        $match: {
          artistId: new require('mongoose').Types.ObjectId(artistId),
          status: 'succeeded',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let availableBalance = 0;
    let totalEarned = 0;
    let totalWithdrawn = 0;

    balanceData.forEach(item => {
      if (item._id === 'deposit') {
        availableBalance += item.total;
        totalEarned += item.total;
      } else if (item._id === 'withdrawal') {
        availableBalance -= item.total;
        totalWithdrawn += item.total;
      }
    });

    // Get payouts in transit
    const inTransitData = await Transaction.aggregate([
      {
        $match: {
          artistId: new require('mongoose').Types.ObjectId(artistId),
          type: 'withdrawal',
          status: 'in_transit',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const payoutsInTransit = inTransitData.length > 0 ? inTransitData[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        availableBalance: {
          amount: availableBalance,
          currency: 'AED'
        },
        totalEarned: {
          amount: totalEarned,
          currency: 'AED',
          percentageChange: 12.5 // Mock - calculate from previous period
        },
        payoutsInTransit: {
          amount: payoutsInTransit,
          currency: 'AED'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions
// @route   GET /api/artist/payments/transactions
// @access  Private (Artist only)
exports.getTransactions = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can view transactions'
      });
    }

    const artistId = req.user.id;
    const { type, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { artistId };
    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .populate('clientId', 'firstName lastName username')
      .populate('appointmentId', 'appointmentDate services')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request withdrawal
// @route   POST /api/artist/payments/withdraw
// @access  Private (Artist only)
exports.requestWithdrawal = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can request withdrawals'
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

    const { amount, bankDetails, description } = req.body;
    const artistId = req.user.id;

    // Check available balance
    const balanceData = await Transaction.aggregate([
      {
        $match: {
          artistId: new require('mongoose').Types.ObjectId(artistId),
          status: 'succeeded'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let availableBalance = 0;
    balanceData.forEach(item => {
      if (item._id === 'deposit') availableBalance += item.total;
      else if (item._id === 'withdrawal') availableBalance -= item.total;
    });

    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal transaction
    const transaction = await Transaction.create({
      artistId,
      type: 'withdrawal',
      amount,
      currency: 'AED',
      status: 'in_transit',
      description: description || `Withdrawal to ${bankDetails?.bankName || 'bank account'}`,
      paymentMethod: 'bank_transfer',
      bankDetails
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};
