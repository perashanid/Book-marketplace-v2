const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book reference is required']
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bidder reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Bid amount is required'],
    min: [0, 'Bid amount cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isWinning: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
bidSchema.index({ book: 1, amount: -1 });
bidSchema.index({ bidder: 1, timestamp: -1 });
bidSchema.index({ book: 1, timestamp: -1 });

// Compound index for finding winning bid
bidSchema.index({ book: 1, isWinning: 1 });

// Method to set as winning bid
bidSchema.methods.setAsWinning = async function() {
  // First, set all other bids for this book as not winning
  await this.constructor.updateMany(
    { book: this.book, _id: { $ne: this._id } },
    { isWinning: false }
  );
  
  // Set this bid as winning
  this.isWinning = true;
  return this.save();
};

// Static method to get highest bid for a book
bidSchema.statics.getHighestBid = function(bookId) {
  return this.findOne({ book: bookId })
    .sort({ amount: -1 })
    .populate('bidder', 'username');
};

// Static method to get bid history for a book
bidSchema.statics.getBidHistory = function(bookId, limit = 10) {
  return this.find({ book: bookId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('bidder', 'username');
};

// Static method to get user's bids
bidSchema.statics.getUserBids = function(userId, limit = 20) {
  return this.find({ bidder: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('book', 'title author currentBid auctionEndTime');
};

module.exports = mongoose.model('Bid', bidSchema);