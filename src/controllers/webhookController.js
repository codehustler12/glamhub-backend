const { getStripeClient, syncArtistByStripeAccountId } = require('../services/stripeConnectService');

// @desc    Stripe webhook handler
// @route   POST /api/webhooks/stripe
// @access  Stripe only
exports.handleStripeWebhook = async (req, res) => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    return res.status(503).json({ success: false, message: 'Stripe not configured' });
  }

  let event;

  try {
    if (webhookSecret) {
      const signature = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
      console.warn('STRIPE_WEBHOOK_SECRET not set — webhook signature not verified (dev only)');
    }
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message);
    return res.status(400).json({ success: false, message: `Webhook Error: ${error.message}` });
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        await syncArtistByStripeAccountId(account.id);
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    res.status(500).json({ success: false, message: 'Webhook handler failed' });
  }
};
