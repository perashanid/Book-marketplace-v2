const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  favoriteGenres: [{
    type: String,
    trim: true
  }],
  favoriteAuthors: [{
    type: String,
    trim: true
  }],
  preferredBookTypes: [{
    type: String,
    enum: ['fiction', 'non-fiction', 'academic', 'biography', 'self-help', 'mystery', 'romance', 'sci-fi', 'fantasy', 'history', 'other'],
    trim: true
  }],
  dislikedGenres: [{
    type: String,
    trim: true
  }],
  priceRange: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 1000
    }
  },
  preferredConditions: [{
    type: String,
    enum: ['new', 'like-new', 'good', 'fair', 'poor']
  }],
  chatHistory: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  activitySummary: {
    totalPurchases: { type: Number, default: 0 },
    totalAuctions: { type: Number, default: 0 },
    totalTrades: { type: Number, default: 0 },
    mostPurchasedGenres: [String],
    mostPurchasedAuthors: [String]
  }
}, {
  timestamps: true
});

// Method to update activity summary
userPreferenceSchema.methods.updateActivitySummary = async function() {
  const Transaction = mongoose.model('Transaction');
  const Book = mongoose.model('Book');
  
  const transactions = await Transaction.find({
    buyer: this.user,
    status: 'completed'
  }).populate('book');
  
  const genreCount = {};
  const authorCount = {};
  let purchases = 0, auctions = 0, trades = 0;
  
  transactions.forEach(tx => {
    if (tx.type === 'auction') auctions++;
    else if (tx.type === 'trade') trades++;
    else purchases++;
    
    if (tx.book) {
      const genre = tx.book.category;
      const author = tx.book.author;
      
      if (genre) genreCount[genre] = (genreCount[genre] || 0) + 1;
      if (author) authorCount[author] = (authorCount[author] || 0) + 1;
    }
  });
  
  this.activitySummary = {
    totalPurchases: purchases,
    totalAuctions: auctions,
    totalTrades: trades,
    mostPurchasedGenres: Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre),
    mostPurchasedAuthors: Object.entries(authorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author]) => author)
  };
  
  await this.save();
};

// Method to add chat message
userPreferenceSchema.methods.addChatMessage = function(role, content) {
  this.chatHistory.push({ role, content });
  
  // Keep only last 50 messages
  if (this.chatHistory.length > 50) {
    this.chatHistory = this.chatHistory.slice(-50);
  }
  
  return this.save();
};

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
