const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a payment intent for booking
 * @param {Number} amount - Amount in smallest currency unit (e.g., cents for USD, fils for AED)
 * @param {String} currency - Currency code (AED, USD, etc.)
 * @param {String} appointmentId - Appointment ID for metadata
 * @param {String} clientId - Client ID for metadata
 * @param {String} artistId - Artist ID for metadata
 * @returns {Promise<Object>} Payment intent object
 */
const createPaymentIntent = async (amount, currency, appointmentId, clientId, artistId) => {
  try {
    // Convert amount to smallest currency unit
    // For AED, USD, EUR: multiply by 100 (cents/fils)
    // For INR, PKR: multiply by 100 (paise)
    const amountInSmallestUnit = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency.toLowerCase(),
      metadata: {
        appointmentId: appointmentId.toString(),
        clientId: clientId.toString(),
        artistId: artistId.toString()
      },
      description: `Booking payment for appointment ${appointmentId}`,
      automatic_payment_methods: {
        enabled: true
      }
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Confirm a payment intent
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Payment confirmation result
 */
const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        status: 'succeeded',
        paymentIntent
      };
    }

    return {
      success: false,
      status: paymentIntent.status,
      error: `Payment status: ${paymentIntent.status}`
    };
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a refund
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @param {Number} amount - Amount to refund (optional, full refund if not provided)
 * @returns {Promise<Object>} Refund result
 */
const createRefund = async (paymentIntentId, amount = null) => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to smallest unit
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      success: true,
      refund
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get payment intent details
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Payment intent details
 */
const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Stripe get payment intent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createRefund,
  getPaymentIntent
};
