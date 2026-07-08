const {
  getPlatformCommissionPercent,
  getCancellationCutoffHours,
  getLateCancellationRefundPercent
} = require('../config/stripeConfig');

/**
 * Hours from now until the appointment start (appointmentDate + time slot).
 */
const getHoursUntilAppointment = (appointment) => {
  const start = new Date(appointment.appointmentDate);
  const time = (appointment.appointmentTime || '').toLowerCase();

  if (time.includes('morning') || time.includes('8am')) {
    start.setHours(8, 0, 0, 0);
  } else if (time.includes('afternoon') || time.includes('12pm')) {
    start.setHours(12, 0, 0, 0);
  } else if (time.includes('evening') || time.includes('4pm')) {
    start.setHours(16, 0, 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }

  const diffMs = start.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
};

/**
 * @returns {{ refundPercent: number, refundAmount: number, reason: string }}
 */
const calculateCancellationRefund = (appointment, cancelledBy) => {
  const totalAmount = appointment.totalAmount || 0;

  if (appointment.paymentMethod !== 'pay_now' || appointment.paymentStatus !== 'paid') {
    return {
      refundPercent: 0,
      refundAmount: 0,
      reason: 'No online payment to refund'
    };
  }

  if (appointment.artistPayoutStatus === 'released') {
    return {
      refundPercent: 0,
      refundAmount: 0,
      reason: 'Payout already released — contact GlamHub support for refund review'
    };
  }

  if (cancelledBy === 'artist') {
    return {
      refundPercent: 100,
      refundAmount: totalAmount,
      reason: 'Full refund — artist cancelled'
    };
  }

  const hoursUntil = getHoursUntilAppointment(appointment);
  const cutoffHours = getCancellationCutoffHours();

  if (hoursUntil >= cutoffHours) {
    return {
      refundPercent: 100,
      refundAmount: totalAmount,
      reason: `Full refund — cancelled ${cutoffHours}+ hours before appointment`
    };
  }

  const latePercent = getLateCancellationRefundPercent();
  const refundAmount = Math.round((totalAmount * latePercent / 100) * 100) / 100;

  return {
    refundPercent: latePercent,
    refundAmount,
    reason: latePercent > 0
      ? `Partial refund — cancelled within ${cutoffHours} hours of appointment`
      : `No refund — cancelled within ${cutoffHours} hours of appointment`
  };
};

const calculateArtistPayout = (totalAmount) => {
  const commissionPercent = getPlatformCommissionPercent();
  const platformCommissionAmount = Math.round((totalAmount * commissionPercent / 100) * 100) / 100;
  const artistPayoutAmount = Math.round((totalAmount - platformCommissionAmount) * 100) / 100;

  return {
    commissionPercent,
    platformCommissionAmount,
    artistPayoutAmount
  };
};

module.exports = {
  getHoursUntilAppointment,
  calculateCancellationRefund,
  calculateArtistPayout
};
