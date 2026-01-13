const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required'],
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'refund'],
    required: [true, 'Transaction type is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
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
    enum: ['pending', 'succeeded', 'failed', 'cancelled', 'in_transit'],
    default: 'pending',
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'wallet', 'cash', 'other'],
    default: 'card'
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    iban: String
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ artistId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
