const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  proposer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trade proposer is required']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trade recipient is required']
  },
  proposerBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  }],
  recipientBooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  }],
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      message: 'Status must be one of: pending, accepted, rejected, completed, cancelled'
    },
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Response message cannot exceed 500 characters']
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
tradeSchema.index({ proposer: 1, status: 1 });
tradeSchema.index({ recipient: 1, status: 1 });
tradeSchema.index({ status: 1, createdAt: -1 });

// Validation to ensure proposer and recipient are different
tradeSchema.pre('save', function(next) {
  if (this.proposer.toString() === this.recipient.toString()) {
    return next(new Error('Cannot create trade with yourself'));
  }
  next();
});

// Validation to ensure books belong to correct users
tradeSchema.pre('save', async function(next) {
  try {
    const Book = mongoose.model('Book');
    
    // Check proposer's books
    const proposerBooksCheck = await Book.find({
      _id: { $in: this.proposerBooks },
      seller: this.proposer,
      isAvailable: true
    });
    
    if (proposerBooksCheck.length !== this.proposerBooks.length) {
      return next(new Error('Some proposer books are not available or do not belong to the proposer'));
    }
    
    // Check recipient's books
    const recipientBooksCheck = await Book.find({
      _id: { $in: this.recipientBooks },
      seller: this.recipient,
      isAvailable: true
    });
    
    if (recipientBooksCheck.length !== this.recipientBooks.length) {
      return next(new Error('Some recipient books are not available or do not belong to the recipient'));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to accept trade
tradeSchema.methods.accept = function(responseMessage) {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  return this.save();
};

// Method to reject trade
tradeSchema.methods.reject = function(responseMessage) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  if (responseMessage) {
    this.responseMessage = responseMessage;
  }
  return this.save();
};

// Method to complete trade (transfer book ownership)
tradeSchema.methods.complete = async function() {
  const Book = mongoose.model('Book');
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update proposer's books to belong to recipient
      await Book.updateMany(
        { _id: { $in: this.proposerBooks } },
        { 
          seller: this.recipient,
          isAvailable: false,
          soldAt: new Date(),
          soldTo: this.recipient
        },
        { session }
      );
      
      // Update recipient's books to belong to proposer
      await Book.updateMany(
        { _id: { $in: this.recipientBooks } },
        { 
          seller: this.proposer,
          isAvailable: false,
          soldAt: new Date(),
          soldTo: this.proposer
        },
        { session }
      );
      
      // Update trade status
      this.status = 'completed';
      this.completedAt = new Date();
      await this.save({ session });
    });
  } finally {
    await session.endSession();
  }
  
  return this;
};

// Static method to get user's trades
tradeSchema.statics.getUserTrades = function(userId, status = null) {
  const query = {
    $or: [
      { proposer: userId },
      { recipient: userId }
    ]
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('proposer', 'username')
    .populate('recipient', 'username')
    .populate('proposerBooks', 'title author')
    .populate('recipientBooks', 'title author');
};

module.exports = mongoose.model('Trade', tradeSchema);