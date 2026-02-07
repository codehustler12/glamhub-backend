const Transaction = require('../models/Transaction');
const Appointment = require('../models/Appointment');
const { validationResult } = require('express-validator');
const { confirmPayment, createRefund, getPaymentIntent } = require('../services/stripeService');

// @desc    Process payment for booking
// @route   POST /api/client/payments/process
// @access  Private (Client only)
exports.processPayment = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can process payments'
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

    const { appointmentId, paymentIntentId } = req.body;
    const clientId = req.user.id;

    // Verify appointment exists and belongs to client
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
        message: 'Not authorized to process payment for this appointment'
      });
    }

    if (appointment.paymentMethod !== 'pay_now') {
      return res.status(400).json({
        success: false,
        message: 'This appointment is set to pay at venue'
      });
    }

    if (appointment.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed'
      });
    }

    // Confirm payment with Stripe
    const paymentResult = await confirmPayment(paymentIntentId);

    if (!paymentResult.success || paymentResult.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        error: paymentResult.error
      });
    }

    // Update appointment payment status
    appointment.paymentStatus = 'paid';
    appointment.status = 'confirmed'; // Auto-confirm when paid
    await appointment.save();

    // Create transaction record
    const transaction = await Transaction.create({
      artistId: appointment.artistId,
      clientId: appointment.clientId,
      appointmentId: appointment._id,
      type: 'deposit',
      amount: appointment.totalAmount,
      currency: appointment.currency,
      status: 'succeeded',
      paymentMethod: 'card',
      transactionId: paymentIntentId,
      description: `Payment for appointment ${appointmentId}`,
      metadata: {
        paymentIntentId,
        appointmentId: appointmentId.toString()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        appointment,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment intent status
// @route   GET /api/client/payments/intent/:paymentIntentId
// @access  Private (Client only)
exports.getPaymentIntentStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can check payment status'
      });
    }

    const { paymentIntentId } = req.params;

    const paymentResult = await getPaymentIntent(paymentIntentId);

    if (!paymentResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Payment intent not found',
        error: paymentResult.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentIntent: paymentResult.paymentIntent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request refund for booking
// @route   POST /api/client/payments/refund
// @access  Private (Client only)
exports.requestRefund = async (req, res, next) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only clients can request refunds'
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

    const { appointmentId, reason } = req.body;
    const clientId = req.user.id;

    // Verify appointment exists and belongs to client
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
        message: 'Not authorized to request refund for this appointment'
      });
    }

    if (appointment.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No payment found to refund'
      });
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      appointmentId,
      type: 'deposit',
      status: 'succeeded'
    });

    if (!transaction || !transaction.transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Create refund with Stripe
    const refundResult = await createRefund(transaction.transactionId);

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Refund failed',
        error: refundResult.error
      });
    }

    // Update appointment payment status
    appointment.paymentStatus = 'refunded';
    await appointment.save();

    // Create refund transaction record
    const refundTransaction = await Transaction.create({
      artistId: appointment.artistId,
      clientId: appointment.clientId,
      appointmentId: appointment._id,
      type: 'refund',
      amount: appointment.totalAmount,
      currency: appointment.currency,
      status: 'succeeded',
      paymentMethod: 'card',
      transactionId: refundResult.refund.id,
      description: `Refund for appointment ${appointmentId}. Reason: ${reason || 'Not provided'}`,
      metadata: {
        originalTransactionId: transaction.transactionId,
        refundId: refundResult.refund.id,
        reason: reason || ''
      }
    });

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund: refundResult.refund,
        transaction: refundTransaction
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get artist payment stats (balance, earned, in transit)
// @route   GET /api/artist/payments/stats
// @access  Private (Artist only)
exports.getArtistPaymentStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access payment stats'
      });
    }

    const artistId = req.user.id;
    const { period = 'all' } = req.query; // all, month, week

    const match = { artistId };
    if (period === 'month') {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      match.createdAt = { $gte: start };
    } else if (period === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      match.createdAt = { $gte: start };
    }

    const succeededDeposits = await Transaction.aggregate([
      { $match: { ...match, type: 'deposit', status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEarned = succeededDeposits.length > 0 ? succeededDeposits[0].total : 0;

    const succeededRefunds = await Transaction.aggregate([
      { $match: { ...match, type: 'refund', status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRefunded = succeededRefunds.length > 0 ? succeededRefunds[0].total : 0;

    const inTransitWithdrawals = await Transaction.aggregate([
      { $match: { artistId, type: 'withdrawal', status: 'in_transit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const payoutsInTransit = inTransitWithdrawals.length > 0 ? inTransitWithdrawals[0].total : 0;

    const availableBalance = totalEarned - totalRefunded - payoutsInTransit;
    const availableBalanceSafe = Math.max(0, availableBalance);

    res.status(200).json({
      success: true,
      data: {
        availableBalance: Math.round(availableBalanceSafe * 100) / 100,
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        payoutsInTransit: Math.round(payoutsInTransit * 100) / 100,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get artist transactions (paginated)
// @route   GET /api/artist/payments/transactions
// @access  Private (Artist only)
exports.getArtistTransactions = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access transactions'
      });
    }

    const artistId = req.user.id;
    const { type = 'all', status: statusFilter = 'all', page = 1, limit = 20, startDate, endDate } = req.query;

    const filter = { artistId };
    if (type !== 'all') filter.type = type;
    if (statusFilter !== 'all') filter.status = statusFilter;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('clientId', 'firstName lastName username')
        .populate('appointmentId', 'appointmentDate appointmentTime totalAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: {
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
};
