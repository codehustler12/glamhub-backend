const {
  getDefaultConnectCountry
} = require('../config/stripeConfig');
const { calculateArtistPayout } = require('./cancellationService');

let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.warn('Stripe module not installed or not configured.');
}

const isStripeConfigured = () => !!(stripe && process.env.STRIPE_SECRET_KEY);

const getStripeClient = () => stripe;

const mapAccountToStatus = (account) => {
  const requirementsDue = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || [])
  ];

  const onboardingComplete = Boolean(
    account.details_submitted &&
    requirementsDue.length === 0 &&
    !account.requirements?.disabled_reason
  );

  let message = 'Complete setup to receive online payments';
  if (onboardingComplete && account.payouts_enabled) {
    message = 'Payouts active';
  } else if (account.details_submitted && requirementsDue.length > 0) {
    message = 'Additional information required to activate payouts';
  } else if (account.details_submitted) {
    message = 'Stripe is reviewing your account';
  }

  return {
    stripeConfigured: isStripeConfigured(),
    hasConnectAccount: true,
    onboardingComplete,
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    requirementsDue,
    message
  };
};

const syncArtistFromStripeAccount = async (artist, account) => {
  const status = mapAccountToStatus(account);
  artist.stripeAccountId = account.id;
  artist.stripeOnboardingComplete = status.onboardingComplete;
  artist.stripeChargesEnabled = status.chargesEnabled;
  artist.stripePayoutsEnabled = status.payoutsEnabled;
  await artist.save();
  return status;
};

const getArtistConnectStatus = async (artist) => {
  if (!isStripeConfigured()) {
    return {
      stripeConfigured: false,
      hasConnectAccount: false,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      message: 'Stripe is not configured on the server'
    };
  }

  if (!artist.stripeAccountId) {
    return {
      stripeConfigured: true,
      hasConnectAccount: false,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      message: 'Set up payouts to receive online payments'
    };
  }

  const account = await stripe.accounts.retrieve(artist.stripeAccountId);
  return syncArtistFromStripeAccount(artist, account);
};

const isArtistReadyForPayNow = (artist) => {
  return Boolean(
    artist.stripeAccountId &&
    artist.stripePayoutsEnabled &&
    artist.stripeOnboardingComplete
  );
};

const createConnectAccount = async (artist) => {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  if (artist.stripeAccountId) {
    return { success: true, accountId: artist.stripeAccountId };
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: getDefaultConnectCountry(),
    email: artist.email || undefined,
    capabilities: {
      transfers: { requested: true }
    },
    business_type: 'individual',
    metadata: {
      glamhubArtistId: artist._id.toString(),
      glamhubUsername: artist.username
    }
  });

  artist.stripeAccountId = account.id;
  await artist.save();

  return { success: true, accountId: account.id };
};

const createAccountOnboardingLink = async (artist, returnUrl, refreshUrl) => {
  const accountResult = await createConnectAccount(artist);
  if (!accountResult.success) {
    return accountResult;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountResult.accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return {
    success: true,
    url: accountLink.url,
    accountId: accountResult.accountId
  };
};

const createDashboardLoginLink = async (artist) => {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  if (!artist.stripeAccountId) {
    return { success: false, error: 'No Stripe Connect account found. Complete payout setup first.' };
  }

  const loginLink = await stripe.accounts.createLoginLink(artist.stripeAccountId);
  return { success: true, url: loginLink.url };
};

const releaseArtistPayout = async (appointment, artist) => {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  if (appointment.paymentMethod !== 'pay_now' || appointment.paymentStatus !== 'paid') {
    return { success: false, error: 'No paid online payment for this appointment' };
  }

  if (appointment.artistPayoutStatus === 'released') {
    return {
      success: true,
      alreadyReleased: true,
      artistPayoutAmount: appointment.artistPayoutAmount,
      platformCommissionAmount: appointment.platformCommissionAmount
    };
  }

  if (appointment.artistPayoutStatus === 'refunded') {
    return { success: false, error: 'Payment was refunded — no payout to release' };
  }

  if (!artist.stripeAccountId) {
    return { success: false, error: 'Artist has not completed Stripe payout setup' };
  }

  if (!artist.stripePayoutsEnabled) {
    return { success: false, error: 'Artist payouts are not enabled yet. Complete Stripe onboarding.' };
  }

  const { platformCommissionAmount, artistPayoutAmount } = calculateArtistPayout(appointment.totalAmount);

  if (artistPayoutAmount <= 0) {
    return { success: false, error: 'Invalid payout amount' };
  }

  const transfer = await stripe.transfers.create({
    amount: Math.round(artistPayoutAmount * 100),
    currency: appointment.currency.toLowerCase(),
    destination: artist.stripeAccountId,
    transfer_group: appointment._id.toString(),
    metadata: {
      appointmentId: appointment._id.toString(),
      artistId: appointment.artistId.toString(),
      clientId: appointment.clientId.toString()
    }
  });

  appointment.artistPayoutStatus = 'released';
  appointment.artistPayoutAmount = artistPayoutAmount;
  appointment.platformCommissionAmount = platformCommissionAmount;
  appointment.stripeTransferId = transfer.id;
  await appointment.save();

  const Transaction = require('../models/Transaction');
  await Transaction.create({
    artistId: appointment.artistId,
    clientId: appointment.clientId,
    appointmentId: appointment._id,
    type: 'withdrawal',
    amount: artistPayoutAmount,
    currency: appointment.currency,
    status: 'succeeded',
    paymentMethod: 'bank_transfer',
    transactionId: transfer.id,
    description: `Artist payout for appointment ${appointment._id}`,
    metadata: {
      stripeTransferId: transfer.id,
      platformCommissionAmount: platformCommissionAmount.toString()
    }
  });

  return {
    success: true,
    transfer,
    artistPayoutAmount,
    platformCommissionAmount
  };
};

const syncArtistByStripeAccountId = async (stripeAccountId) => {
  const User = require('../models/User');
  const artist = await User.findOne({ stripeAccountId, role: 'artist' });
  if (!artist) {
    return null;
  }

  const account = await stripe.accounts.retrieve(stripeAccountId);
  await syncArtistFromStripeAccount(artist, account);
  return artist;
};

module.exports = {
  isStripeConfigured,
  getStripeClient,
  mapAccountToStatus,
  getArtistConnectStatus,
  isArtistReadyForPayNow,
  createConnectAccount,
  createAccountOnboardingLink,
  createDashboardLoginLink,
  releaseArtistPayout,
  syncArtistByStripeAccountId,
  syncArtistFromStripeAccount
};
