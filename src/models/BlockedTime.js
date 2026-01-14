const mongoose = require('mongoose');

const blockedTimeSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['blocked_time', 'vacation'],
    required: [true, 'Type is required'],
    index: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  startTime: {
    type: String, // For blocked_time: "01:00 PM", "14:00", etc.
    trim: true
  },
  duration: {
    type: String, // For blocked_time: "3 hours", "2 hours", etc.
    trim: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
blockedTimeSchema.index({ artistId: 1, type: 1, startDate: 1, endDate: 1 });
blockedTimeSchema.index({ startDate: 1, endDate: 1 });

// Validation: endDate must be after startDate
blockedTimeSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

module.exports = mongoose.model('BlockedTime', blockedTimeSchema);
