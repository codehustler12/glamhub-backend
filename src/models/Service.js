const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required']
  },
  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  serviceDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Service description cannot exceed 200 characters'],
    default: ''
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['makeup', 'hair', 'nail', 'facial', 'bridal', 'party', 'other'],
    default: 'other'
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'per_person'],
    default: 'fixed'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'AED',
    enum: ['AED', 'USD', 'EUR', 'INR', 'PKR'],
    uppercase: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    default: '1h'
  },
  addOns: [{
    name: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
serviceSchema.index({ artistId: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
