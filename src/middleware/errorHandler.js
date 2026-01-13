const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for dev
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error.statusCode = 404;
    error.message = message;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error.statusCode = 400;
    error.message = message;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error.statusCode = 400;
    error.message = message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please login again.';
    error.statusCode = 401;
    error.message = message;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please login again.';
    error.statusCode = 401;
    error.message = message;
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Maximum size is 5MB.';
    error.statusCode = 400;
    error.message = message;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files. Maximum 10 images allowed.';
    error.statusCode = 400;
    error.message = message;
  }

  if (err.message && err.message.includes('Only image files are allowed')) {
    error.statusCode = 400;
    error.message = 'Only image files are allowed!';
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

