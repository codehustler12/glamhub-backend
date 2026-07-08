const getPlatformCommissionPercent = () => {
  const value = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 10;
};

const getCancellationCutoffHours = () => {
  const value = parseInt(process.env.CANCELLATION_CUTOFF_HOURS, 10);
  return Number.isFinite(value) && value > 0 ? value : 24;
};

const getLateCancellationRefundPercent = () => {
  const value = parseFloat(process.env.LATE_CANCELLATION_REFUND_PERCENT);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 0;
};

const getDefaultConnectCountry = () => process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || 'AE';

module.exports = {
  getPlatformCommissionPercent,
  getCancellationCutoffHours,
  getLateCancellationRefundPercent,
  getDefaultConnectCountry
};
