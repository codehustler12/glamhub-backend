const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required'],
    index: true
  },
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Artist ID is required'],
    index: true
  }
}, {
  timestamps: true
});

// Prevent duplicate favorites
favoriteSchema.index({ clientId: 1, artistId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
