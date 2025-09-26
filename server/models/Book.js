const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  condition: {
    type: String,
    enum: {
      values: ['new', 'like-new', 'good', 'fair', 'poor'],
      message: 'Condition must be one of: new, like-new, good, fair, poor'
    },
    required: [true, 'Book condition is required']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  pdfLink: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.pdf$/i.test(v);
      },
      message: 'Invalid PDF URL format'
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required']
  },
  listingTypes: {
    fixedPrice: {
      type: Boolean,
      default: false
    },
    auction: {
      type: Boolean,
      default: false
    },
    tradeOnly: {
      type: Boolean,
      default: false
    }
  },
  
  // Legacy field for backward compatibility
  listingType: {
    type: String,
    enum: {
      values: ['auction', 'fixed-price', 'trade-only'],
      message: 'Listing type must be one of: auction, fixed-price, trade-only'
    }
  },
  
  // Auction-specific fields
  startingBid: {
    type: Number,
    min: [0, 'Starting bid cannot be negative'],
    validate: {
      validator: function(v) {
        return !this.listingTypes?.auction || (v !== null && v !== undefined);
      },
      message: 'Starting bid is required for auction listings'
    }
  },
  currentBid: {
    type: Number,
    min: [0, 'Current bid cannot be negative']
  },
  auctionEndTime: {
    type: Date,
    validate: {
      validator: function(v) {
        return !this.listingTypes?.auction || (v && v > new Date());
      },
      message: 'Auction end time must be in the future for auction listings'
    }
  },
  auctionDuration: {
    type: Number,
    min: [1, 'Auction duration must be at least 1 day'],
    max: [30, 'Auction duration cannot exceed 30 days']
  },
  isAuctionActive: {
    type: Boolean,
    default: false
  },
  
  // Fixed-price fields
  fixedPrice: {
    type: Number,
    min: [0, 'Fixed price cannot be negative'],
    validate: {
      validator: function(v) {
        return !this.listingTypes?.fixedPrice || (v !== null && v !== undefined);
      },
      message: 'Fixed price is required for fixed-price listings'
    }
  },
  acceptsOffers: {
    type: Boolean,
    default: false
  },
  
  // Status tracking
  isAvailable: {
    type: Boolean,
    default: true
  },
  soldAt: {
    type: Date
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search functionality
bookSchema.index({ title: 'text', author: 'text', description: 'text' });
bookSchema.index({ category: 1 });
bookSchema.index({ listingType: 1 });
bookSchema.index({ seller: 1 });
bookSchema.index({ auctionEndTime: 1 });

// Virtual for auction time remaining
bookSchema.virtual('timeRemaining').get(function() {
  if (this.listingType === 'auction' && this.auctionEndTime) {
    const now = new Date();
    const remaining = this.auctionEndTime - now;
    return remaining > 0 ? remaining : 0;
  }
  return null;
});

// Method to check if auction has ended
bookSchema.methods.hasAuctionEnded = function() {
  if (this.listingType !== 'auction') return false;
  return new Date() >= this.auctionEndTime;
};

// Method to end auction
bookSchema.methods.endAuction = function() {
  if (this.listingType === 'auction') {
    this.isAuctionActive = false;
    this.isAvailable = false;
  }
};

module.exports = mongoose.model('Book', bookSchema);