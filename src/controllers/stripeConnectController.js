const User = require('../models/User');
const {
  getArtistConnectStatus,
  createAccountOnboardingLink,
  createDashboardLoginLink
} = require('../services/stripeConnectService');

// @desc    Get artist Stripe Connect status
// @route   GET /api/artist/stripe/status
// @access  Private (Artist only)
exports.getConnectStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access Stripe Connect status'
      });
    }

    const artist = await User.findById(req.user.id);
    const status = await getArtistConnectStatus(artist);

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Connect account and return onboarding URL
// @route   POST /api/artist/stripe/connect
// @access  Private (Artist only)
exports.startConnectOnboarding = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can set up Stripe Connect'
      });
    }

    const { returnUrl, refreshUrl } = req.body;
    if (!returnUrl || !refreshUrl) {
      return res.status(400).json({
        success: false,
        message: 'returnUrl and refreshUrl are required'
      });
    }

    const artist = await User.findById(req.user.id);
    const result = await createAccountOnboardingLink(artist, returnUrl, refreshUrl);

    if (!result.success) {
      const message = result.error || 'Could not create Stripe onboarding link';
      const needsConnectSignup = /signed up for Connect/i.test(message);
      return res.status(needsConnectSignup ? 400 : 500).json({
        success: false,
        message,
        code: needsConnectSignup ? 'CONNECT_NOT_ENABLED' : 'CONNECT_ONBOARDING_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Redirect artist to Stripe to complete payout setup',
      data: {
        url: result.url,
        accountId: result.accountId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Stripe Express dashboard login link (or onboarding link if incomplete)
// @route   POST /api/artist/stripe/dashboard-link
// @access  Private (Artist only)
exports.getDashboardLink = async (req, res, next) => {
  try {
    if (req.user.role !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can access the Stripe dashboard link'
      });
    }

    const { returnUrl, refreshUrl } = req.body || {};
    const artist = await User.findById(req.user.id);
    const result = await createDashboardLoginLink(artist, returnUrl, refreshUrl);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Could not create dashboard link',
        code: result.code || 'DASHBOARD_LINK_FAILED',
        detail: result.detail
      });
    }

    res.status(200).json({
      success: true,
      message: result.message || 'Stripe dashboard link created',
      data: {
        url: result.url,
        type: result.type || 'dashboard'
      }
    });
  } catch (error) {
    next(error);
  }
};
