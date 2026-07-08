const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction');
const { createRefund } = require('./stripeService');
const { calculateCancellationRefund } = require('./cancellationService');

const getPaymentIntentId = async (appointment) => {
  if (appointment.paymentIntentId) {
    return appointment.paymentIntentId;
  }

  const transaction = await Transaction.findOne({
    appointmentId: appointment._id,
    type: 'deposit',
    status: 'succeeded'
  });

  return transaction?.transactionId || null;
};

const processAppointmentRefund = async (appointment, cancelledBy) => {
  const refundInfo = calculateCancellationRefund(appointment, cancelledBy);

  if (refundInfo.refundAmount <= 0) {
    return {
      ...refundInfo,
      refunded: false
    };
  }

  const paymentIntentId = await getPaymentIntentId(appointment);
  if (!paymentIntentId) {
    return {
      ...refundInfo,
      refunded: false,
      error: 'Payment record not found for refund'
    };
  }

  const refundResult = await createRefund(paymentIntentId, refundInfo.refundAmount);
  if (!refundResult.success) {
    return {
      ...refundInfo,
      refunded: false,
      error: refundResult.error
    };
  }

  appointment.paymentStatus = 'refunded';
  appointment.artistPayoutStatus = 'refunded';
  await appointment.save();

  await Transaction.create({
    artistId: appointment.artistId,
    clientId: appointment.clientId,
    appointmentId: appointment._id,
    type: 'refund',
    amount: refundInfo.refundAmount,
    currency: appointment.currency,
    status: 'succeeded',
    paymentMethod: 'card',
    transactionId: refundResult.refund.id,
    description: `Refund for appointment ${appointment._id}. ${refundInfo.reason}`,
    metadata: {
      paymentIntentId,
      refundId: refundResult.refund.id,
      refundPercent: refundInfo.refundPercent,
      cancelledBy
    }
  });

  return {
    ...refundInfo,
    refunded: true,
    refund: refundResult.refund
  };
};

const recordBookingPayment = async (appointment, paymentIntentId) => {
  appointment.paymentIntentId = paymentIntentId;
  if (appointment.paymentMethod === 'pay_now' && appointment.paymentStatus === 'paid') {
    appointment.artistPayoutStatus = 'pending';
  } else {
    appointment.artistPayoutStatus = 'not_applicable';
  }
  await appointment.save();

  const existing = await Transaction.findOne({
    appointmentId: appointment._id,
    type: 'deposit',
    status: 'succeeded'
  });

  if (!existing) {
    await Transaction.create({
      artistId: appointment.artistId,
      clientId: appointment.clientId,
      appointmentId: appointment._id,
      type: 'deposit',
      amount: appointment.totalAmount,
      currency: appointment.currency,
      status: 'succeeded',
      paymentMethod: 'card',
      transactionId: paymentIntentId,
      description: `Payment for appointment ${appointment._id}`,
      metadata: {
        paymentIntentId,
        appointmentId: appointment._id.toString()
      }
    });
  }
};

module.exports = {
  getPaymentIntentId,
  processAppointmentRefund,
  recordBookingPayment
};
