const jwt = require('jsonwebtoken');

// Create and send token with cookie
const sendToken = (user, statusCode, res, message, rememberMe = false) => {
  // Token expiry: 30 days if rememberMe, otherwise 7 days
  const tokenExpire = rememberMe ? '30d' : process.env.JWT_EXPIRE;
  const cookieExpireDays = rememberMe ? 30 : parseInt(process.env.COOKIE_EXPIRE);

  // Create token with custom expiry
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpire }
  );

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output
  const userResponse = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    isVerified: user.isVerified,
    createdAt: user.createdAt
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      data: {
        user: userResponse,
        token
      }
    });
};

module.exports = sendToken;
