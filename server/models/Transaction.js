const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: {
      values: ['auction', 'fixed-price', 'offer', 'trade'],
      message: 'Transaction type must be one of: auction, fixed-price, offer, trade'
    },
    required: [true, 'Transaction type is required']
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type !== 'trade';
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: function() {
      return this.type !== 'trade';
    }
  },
  // For trade transactions, we reference the trade
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: function() {
      return this.type === 'trade';
    }
  },
  amount: {
    type: Number,
    min: [0, 'Transaction amount cannot be negative'],
    required: function() {
      return this.type !== 'trade';
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'cancelled', 'failed'],
      message: 'Status must be one of: pending, completed, cancelled, failed'
    },
    default: 'pending'
  },
  // Reference to related documents
  bid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  // Transaction details
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Post-save hook to update user activity summary
transactionSchema.post('save', async function(doc) {
  if (doc.status === 'completed' && doc.buyer) {
    try {
      const UserPreference = mongoose.model('UserPreference');
      let prefs = await UserPreference.findOne({ user: doc.buyer });
      
      if (!prefs) {
        prefs = await UserPreference.create({ user: doc.buyer });
      }
      
      // Update activity summary asynchronously
      await prefs.updateActivitySummary();
    } catch (error) {
      console.error('Failed to update user activity summary:', error);
    }
  }
});

// Index for efficient queries
transactionSchema.index({ buyer: 1, createdAt: -1 });
transactionSchema.index({ seller: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ book: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// Method to complete transaction
transactionSchema.methods.complete = async function() {
  const User = mongoose.model('User');
  const Book = mongoose.model('Book');
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      if (this.type !== 'trade') {
        // Handle monetary transactions
        if (this.buyer && this.amount > 0) {
          // Deduct from buyer's balance
          await User.findByIdAndUpdate(
            this.buyer,
            { $inc: { balance: -this.amount } },
            { session }
          );
          
          // Add to seller's balance
          await User.findByIdAndUpdate(
            this.seller,
            { $inc: { balance: this.amount } },
            { session }
          );
        }
        
        // Update book status
        if (this.book) {
          await Book.findByIdAndUpdate(
            this.book,
            {
              isAvailable: false,
              soldAt: new Date(),
              soldTo: this.buyer
            },
            { session }
          );
        }
      }
      
      // Update transaction status
      this.status = 'completed';
      this.completedAt = new Date();
      await this.save({ session });
    });
  } finally {
    await session.endSession();
  }
  
  return this;
};

// Method to cancel transaction
transactionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// Method to mark as failed
transactionSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Static method to get user's transaction history
transactionSchema.statics.getUserTransactions = function(userId, type = null, limit = 20) {
  const query = {
    $or: [
      { buyer: userId },
      { seller: userId }
    ]
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('buyer', 'username')
    .populate('seller', 'username')
    .populate('book', 'title author')
    .populate('trade');
};

// Static method to get book's transaction history
transactionSchema.statics.getBookTransactions = function(bookId) {
  return this.find({ book: bookId })
    .sort({ createdAt: -1 })
    .populate('buyer', 'username')
    .populate('seller', 'username');
};

// Static method to create auction transaction
transactionSchema.statics.createAuctionTransaction = function(bid, book) {
  return this.create({
    type: 'auction',
    buyer: bid.bidder,
    seller: book.seller,
    book: book._id,
    amount: bid.amount,
    bid: bid._id,
    notes: `Auction won with bid of ${bid.amount}`
  });
};

// Static method to create fixed-price transaction
transactionSchema.statics.createFixedPriceTransaction = function(buyer, book) {
  return this.create({
    type: 'fixed-price',
    buyer: buyer,
    seller: book.seller,
    book: book._id,
    amount: book.fixedPrice,
    notes: `Fixed-price purchase of ${book.fixedPrice}`
  });
};

// Static method to create offer transaction
transactionSchema.statics.createOfferTransaction = function(offer, book) {
  return this.create({
    type: 'offer',
    buyer: offer.buyer,
    seller: book.seller,
    book: book._id,
    amount: offer.amount,
    offer: offer._id,
    notes: `Offer accepted for ${offer.amount}`
  });
};

// Static method to create trade transaction
transactionSchema.statics.createTradeTransaction = function(trade) {
  return this.create({
    type: 'trade',
    seller: trade.proposer, // One of the parties
    trade: trade._id,
    notes: 'Book trade completed'
  });
};

module.exports = mongoose.model('Transaction', transactionSchema);