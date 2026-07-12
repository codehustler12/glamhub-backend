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

const ACCOUNT_INCLUDES = [
  'configuration.recipient',
  'identity',
  'requirements',
  'defaults'
];

const isStripeConfigured = () => !!(stripe && process.env.STRIPE_SECRET_KEY);

const getStripeClient = () => stripe;

const getStripeErrorMessage = (error) => {
  return (
    error?.raw?.message ||
    error?.message ||
    'Stripe Connect request failed'
  );
};

/**
 * Map Accounts v2 (or legacy v1) account payload to frontend status shape.
 */
const mapAccountToStatus = (account) => {
  const requirementsDue = [
    ...(account.requirements?.entries_due || []),
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || [])
  ].map((item) => (typeof item === 'string' ? item : item?.name || JSON.stringify(item)));

  const transfersStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ||
    null;

  const payoutsEnabled = transfersStatus
    ? transfersStatus === 'active'
    : Boolean(account.payouts_enabled);

  const chargesEnabled = Boolean(
    account.configuration?.merchant?.capabilities?.card_payments?.status === 'active' ||
    account.charges_enabled
  );

  const detailsSubmitted = Boolean(
    account.requirements?.summary?.minimum_deadline == null
      ? account.details_submitted ?? requirementsDue.length === 0
      : account.details_submitted
  );

  const onboardingComplete = Boolean(
    (account.details_submitted || transfersStatus === 'active' || transfersStatus === 'pending') &&
    requirementsDue.length === 0 &&
    !account.requirements?.disabled_reason &&
    (payoutsEnabled || transfersStatus === 'pending' || transfersStatus === 'active')
  );

  // For our escrow flow, "ready" means transfers capability is active
  const readyForPayouts = payoutsEnabled;

  let message = 'Complete setup to receive online payments';
  if (readyForPayouts) {
    message = 'Payouts active';
  } else if (transfersStatus === 'pending') {
    message = 'Stripe is reviewing your account';
  } else if (requirementsDue.length > 0) {
    message = 'Additional information required to activate payouts';
  } else if (detailsSubmitted || account.details_submitted) {
    message = 'Stripe is reviewing your account';
  }

  return {
    stripeConfigured: isStripeConfigured(),
    hasConnectAccount: true,
    onboardingComplete: readyForPayouts || onboardingComplete,
    chargesEnabled,
    payoutsEnabled: readyForPayouts,
    requirementsDue,
    message
  };
};

const retrieveConnectAccount = async (accountId) => {
  try {
    return await stripe.v2.core.accounts.retrieve(accountId, {
      include: ACCOUNT_INCLUDES
    });
  } catch (v2Error) {
    // Fallback for any older v1 express accounts already stored
    return stripe.accounts.retrieve(accountId);
  }
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

  const account = await retrieveConnectAccount(artist.stripeAccountId);
  return syncArtistFromStripeAccount(artist, account);
};

const isArtistReadyForPayNow = (artist) => {
  return Boolean(
    artist.stripeAccountId &&
    artist.stripePayoutsEnabled &&
    artist.stripeOnboardingComplete
  );
};

const createConnectAccountV2 = async (artist, displayName, country) => {
  return stripe.v2.core.accounts.create({
    contact_email: artist.email || undefined,
    display_name: displayName,
    dashboard: 'express',
    identity: {
      country
    },
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application'
      }
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: {
              requested: true
            }
          }
        }
      }
    },
    metadata: {
      glamhubArtistId: artist._id.toString(),
      glamhubUsername: artist.username
    },
    include: ACCOUNT_INCLUDES
  });
};

/**
 * Fallback for platforms that have Connect enabled but not Accounts v2.
 * Uses controller properties (not legacy type: express).
 */
const createConnectAccountV1 = async (artist, displayName, country) => {
  return stripe.accounts.create({
    country: country.toUpperCase(),
    email: artist.email || undefined,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true }
    },
    business_profile: {
      name: displayName,
      product_description: 'Beauty and makeup services via GlamHub'
    },
    metadata: {
      glamhubArtistId: artist._id.toString(),
      glamhubUsername: artist.username
    },
    controller: {
      losses: { payments: 'application' },
      fees: { payer: 'application' },
      stripe_dashboard: { type: 'express' },
      requirement_collection: 'stripe'
    }
  });
};

const isAccountsV2DisabledError = (error) => {
  const message = getStripeErrorMessage(error);
  const code = error?.code || error?.raw?.code;
  return (
    code === 'accounts_v2_access_blocked' ||
    /Accounts v2 is not enabled/i.test(message) ||
    /signed up for Connect/i.test(message)
  );
};

/**
 * Create connected account for escrow transfers (platform holds funds, then pays artist).
 * Tries Accounts v2 first; falls back to Accounts v1 controller API if v2 is not enabled.
 */
const createConnectAccount = async (artist) => {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  if (artist.stripeAccountId) {
    return { success: true, accountId: artist.stripeAccountId };
  }

  const displayName = `${artist.firstName || ''} ${artist.lastName || ''}`.trim() || artist.username;
  const country = getDefaultConnectCountry().toLowerCase();

  try {
    let account;
    try {
      account = await createConnectAccountV2(artist, displayName, country);
    } catch (v2Error) {
      if (!isAccountsV2DisabledError(v2Error)) {
        throw v2Error;
      }
      console.warn('Accounts v2 unavailable, falling back to Accounts v1 controller:', getStripeErrorMessage(v2Error));
      account = await createConnectAccountV1(artist, displayName, country);
    }

    artist.stripeAccountId = account.id;
    await artist.save();

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('Stripe Connect account create error:', error);
    const message = getStripeErrorMessage(error);
    if (/signed up for Connect|platform-setup|Accounts v2 is not enabled/i.test(message)) {
      return {
        success: false,
        error:
          'Stripe Connect is not fully enabled on the GlamHub Stripe account yet. Open Stripe Dashboard → Settings → Connect → Platform setup (https://dashboard.stripe.com/settings/connect/platform-setup), complete setup, then try again.'
      };
    }
    return {
      success: false,
      error: message
    };
  }
};

const createAccountOnboardingLink = async (artist, returnUrl, refreshUrl) => {
  const accountResult = await createConnectAccount(artist);
  if (!accountResult.success) {
    return accountResult;
  }

  try {
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountResult.accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient'],
          collection_options: {
            fields: 'eventually_due'
          },
          return_url: returnUrl,
          refresh_url: refreshUrl
        }
      }
    });

    return {
      success: true,
      url: accountLink.url,
      accountId: accountResult.accountId
    };
  } catch (error) {
    console.error('Stripe Connect account link error:', error);
    // Fallback to v1 Account Links if v2 links are unavailable
    try {
      const legacyLink = await stripe.accountLinks.create({
        account: accountResult.accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });
      return {
        success: true,
        url: legacyLink.url,
        accountId: accountResult.accountId
      };
    } catch (legacyError) {
      return {
        success: false,
        error: getStripeErrorMessage(error) || getStripeErrorMessage(legacyError)
      };
    }
  }
};

const createDashboardLoginLink = async (artist) => {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured' };
  }

  if (!artist.stripeAccountId) {
    return { success: false, error: 'No Stripe Connect account found. Complete payout setup first.' };
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(artist.stripeAccountId);
    return { success: true, url: loginLink.url };
  } catch (error) {
    return { success: false, error: getStripeErrorMessage(error) };
  }
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

  const account = await retrieveConnectAccount(stripeAccountId);
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
