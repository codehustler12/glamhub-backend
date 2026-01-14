const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const otpRoutes = require('./routes/otpRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const artistRoutes = require('./routes/artistRoutes');
const clientRoutes = require('./routes/clientRoutes');
const path = require('path');

const app = express();

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/client', clientRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  
  // MongoDB connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isDbConnected = dbStatus === 1;
  
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    message: 'Glamhub API is running!',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusText[dbStatus] || 'unknown',
      connected: isDbConnected,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    }
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error Handler Middleware
app.use(errorHandler);

module.exports = app;

