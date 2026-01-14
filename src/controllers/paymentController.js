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
