const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required'],
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required'],
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required']
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  venue: {
    type: String,
    enum: ['artist_studio', 'client_venue'],
    default: 'artist_studio'
  },
  venueDetails: {
    venueName: {
      type: String,
      trim: true,
      default: ''
    },
    street: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    }
  },
  paymentMethod: {
    type: String,
    enum: ['pay_at_venue', 'pay_now'],
    default: 'pay_at_venue'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  serviceFee: {
    type: Number,
    default: 0,
    min: 0
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    serviceName: String,
    price: Number,
    currency: String
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },
  currency: {
    type: String,
    default: 'AED',
    enum: ['AED', 'USD', 'EUR', 'INR', 'PKR'],
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
    index: true
  },
  serviceType: {
    type: String,
    enum: ['makeup', 'hair', 'nail', 'facial', 'bridal', 'party', 'other'],
    default: 'other'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: ''
  },
  cancelledBy: {
    type: String,
    enum: ['artist', 'client', 'system'],
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
appointmentSchema.index({ artistId: 1, status: 1, appointmentDate: 1 });
appointmentSchema.index({ clientId: 1, status: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
