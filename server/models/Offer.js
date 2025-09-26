const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book reference is required']
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Offer amount is required'],
    min: [0, 'Offer amount cannot be negative']
  },
  message: {
    type: String,
    trim: true,
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'rejected', 'counter-offered', 'expired'],
      message: 'Status must be one of: pending, accepted, rejected, counter-offered, expired'
    },
    default: 'pending'
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [300, 'Response message cannot exceed 300 characters']
  },
  counterOfferAmount: {
    type: Number,
    min: [0, 'Counter offer amount cannot be negative']
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Offers expire after 7 days by default
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
offerSchema.index({ book: 1, status: 1 });
offerSchema.index({ buyer: 1, status: 1 });
offerSchema.index({ expiresAt: 1 });
offerSchema.index({ createdAt: -1 });

// Validation to ensure buyer is not the seller
offerSchema.pre('save', async function(next) {
  try {
    const Book = mongoose.model('Book');
    const book = await Book.findById(this.book);
    
    if (!book) {
      return next(new Error('Book not found'));
    }
    
    if (book.seller.toString() === this.buyer.toString()) {
      return next(new Error('Cannot make offer on your own book'));
    }
    
    // Ensure book accepts offers
    if (!book.acceptsOffers) {
      return next(new Error('This book does not accept offers'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if offer has expired
offerSchema.methods.hasExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to accept offer
offerSchema.methods.accept = function(responseMessage) {
  if (this.hasExpired()) {
    throw new Error('Cannot accept expired offer');
  }
  
  this.status = 'accepted';
  this.acceptedAt = new Date();
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  return this.save();
};

// Method to reject offer
offerSchema.methods.reject = function(responseMessage) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  return this.save();
};

// Method to counter offer
offerSchema.methods.counterOffer = function(counterAmount, responseMessage) {
  if (this.hasExpired()) {
    throw new Error('Cannot counter expired offer');
  }
  
  this.status = 'counter-offered';
  this.counterOfferAmount = counterAmount;
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  // Extend expiration by 3 days for counter offer
  this.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return this.save();
};

// Static method to expire old offers
offerSchema.statics.expireOldOffers = async function() {
  return this.updateMany(
    { 
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
};

// Static method to get offers for a book
offerSchema.statics.getBookOffers = function(bookId, status = null) {
  const query = { book: bookId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('buyer', 'username');
};

// Static method to get user's offers
offerSchema.statics.getUserOffers = function(userId, status = null) {
  const query = { buyer: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('book', 'title author fixedPrice seller')
    .populate({
      path: 'book',
      populate: {
        path: 'seller',
        select: 'username'
      }
    });
};

module.exports = mongoose.model('Offer', offerSchema);