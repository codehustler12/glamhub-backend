const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required'],
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required']
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  categories: {
    professionalism: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    }
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ artistId: 1, isPublished: 1 });
reviewSchema.index({ clientId: 1 });
reviewSchema.index({ appointmentId: 1 });

// Prevent duplicate reviews for same appointment
reviewSchema.index({ appointmentId: 1, clientId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
