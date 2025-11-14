const { GoogleGenerativeAI } = require('@google/generative-ai');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const UserPreference = require('../models/UserPreference');

class AIRecommendationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // Get user's activity history
  async getUserActivity(userId) {
    const transactions = await Transaction.find({
      buyer: userId,
      status: 'completed'
    }).populate('book').limit(20);

    const purchased = [];
    const auctioned = [];
    const traded = [];

    transactions.forEach(tx => {
      if (!tx.book) return;
      
      const bookInfo = {
        title: tx.book.title,
        author: tx.book.author,
        category: tx.book.category
      };

      if (tx.type === 'auction') auctioned.push(bookInfo);
      else if (tx.type === 'trade') traded.push(bookInfo);
      else purchased.push(bookInfo);
    });

    return { purchased, auctioned, traded };
  }

  // Get user preferences
  async getUserPreferences(userId) {
    let prefs = await UserPreference.findOne({ user: userId });
    
    if (!prefs) {
      prefs = await UserPreference.create({ user: userId });
    }
    
    return prefs;
  }

  // Generate recommendations based on user activity and preferences
  async generateRecommendations(userId, userMessage = null) {
    const activity = await this.getUserActivity(userId);
    const preferences = await this.getUserPreferences(userId);

    // Build context for AI
    const context = this.buildUserContext(activity, preferences);

    // Get AI recommendations
    const systemPrompt = "You are a knowledgeable book recommendation assistant. Provide personalized book recommendations based on user preferences and reading history. Format each recommendation as: TITLE by AUTHOR (Genre) - Reason.";
    
    const prompt = userMessage 
      ? `${systemPrompt}\n\nUser says: "${userMessage}"\n\n${context}\n\nBased on this, recommend 5-10 books with title, author, genre, and brief reason.`
      : `${systemPrompt}\n\n${context}\n\nBased on this user's activity and preferences, recommend 5-10 books with title, author, genre, and brief reason.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    // Parse recommendations
    const recommendations = this.parseRecommendations(aiResponse);
    
    // Check availability in marketplace
    const enrichedRecommendations = await this.checkAvailability(recommendations);

    return {
      recommendations: enrichedRecommendations,
      aiResponse
    };
  }

  // Chat with AI about book preferences
  async chatWithAI(userId, userMessage) {
    const preferences = await this.getUserPreferences(userId);
    const activity = await this.getUserActivity(userId);

    // Build conversation context
    const systemContext = `You are a friendly book recommendation assistant for a book marketplace. Help users discover books they'll love based on their preferences and reading history. Be conversational and ask clarifying questions when needed. When recommending books, always mention if they might be available on the marketplace.

User's reading history:
- Purchased: ${activity.purchased.map(b => `${b.title} by ${b.author}`).join(', ') || 'None yet'}
- Won at auction: ${activity.auctioned.map(b => `${b.title} by ${b.author}`).join(', ') || 'None yet'}
- Traded: ${activity.traded.map(b => `${b.title} by ${b.author}`).join(', ') || 'None yet'}

User's preferences:
- Favorite genres: ${preferences.favoriteGenres.join(', ') || 'Not specified'}
- Favorite authors: ${preferences.favoriteAuthors.join(', ') || 'Not specified'}
- Preferred types: ${preferences.preferredBookTypes.join(', ') || 'Not specified'}`;

    // Build conversation history
    const recentHistory = preferences.chatHistory.slice(-10);
    let conversationHistory = '';
    recentHistory.forEach(msg => {
      conversationHistory += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });

    // Create full prompt
    const fullPrompt = `${systemContext}

Previous conversation:
${conversationHistory}

User: ${userMessage}`;

    const result = await this.model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Save to chat history
    await preferences.addChatMessage('user', userMessage);
    await preferences.addChatMessage('assistant', aiResponse);

    // Extract any book recommendations from the response
    const recommendations = this.parseRecommendations(aiResponse);
    const enrichedRecommendations = await this.checkAvailability(recommendations);

    return {
      response: aiResponse,
      recommendations: enrichedRecommendations
    };
  }

  // Update user preferences from chat
  async updatePreferencesFromChat(userId, preferences) {
    const userPrefs = await this.getUserPreferences(userId);

    if (preferences.genres) {
      userPrefs.favoriteGenres = [...new Set([...userPrefs.favoriteGenres, ...preferences.genres])];
    }

    if (preferences.authors) {
      userPrefs.favoriteAuthors = [...new Set([...userPrefs.favoriteAuthors, ...preferences.authors])];
    }

    if (preferences.types) {
      userPrefs.preferredBookTypes = [...new Set([...userPrefs.preferredBookTypes, ...preferences.types])];
    }

    if (preferences.priceRange) {
      userPrefs.priceRange = preferences.priceRange;
    }

    await userPrefs.save();
    return userPrefs;
  }

  // Build user context for AI
  buildUserContext(activity, preferences) {
    let context = "User Profile:\n";

    if (activity.purchased.length > 0) {
      context += `\nRecently Purchased Books:\n${activity.purchased.map(b => `- ${b.title} by ${b.author} (${b.category})`).join('\n')}`;
    }

    if (activity.auctioned.length > 0) {
      context += `\n\nBooks Won at Auction:\n${activity.auctioned.map(b => `- ${b.title} by ${b.author} (${b.category})`).join('\n')}`;
    }

    if (activity.traded.length > 0) {
      context += `\n\nBooks Traded:\n${activity.traded.map(b => `- ${b.title} by ${b.author} (${b.category})`).join('\n')}`;
    }

    if (preferences.favoriteGenres.length > 0) {
      context += `\n\nFavorite Genres: ${preferences.favoriteGenres.join(', ')}`;
    }

    if (preferences.favoriteAuthors.length > 0) {
      context += `\n\nFavorite Authors: ${preferences.favoriteAuthors.join(', ')}`;
    }

    if (preferences.preferredBookTypes.length > 0) {
      context += `\n\nPreferred Book Types: ${preferences.preferredBookTypes.join(', ')}`;
    }

    if (preferences.activitySummary.mostPurchasedGenres.length > 0) {
      context += `\n\nMost Purchased Genres: ${preferences.activitySummary.mostPurchasedGenres.join(', ')}`;
    }

    return context;
  }

  // Parse AI recommendations
  parseRecommendations(aiResponse) {
    const recommendations = [];
    const lines = aiResponse.split('\n');

    lines.forEach(line => {
      // Match patterns like: "Title by Author (Genre)" or "1. Title by Author"
      const match = line.match(/(?:\d+\.\s*)?["']?([^"']+?)["']?\s+by\s+([^(]+?)(?:\s*\(([^)]+)\))?(?:\s*[-–—]\s*(.+))?$/i);
      
      if (match) {
        recommendations.push({
          title: match[1].trim(),
          author: match[2].trim(),
          genre: match[3] ? match[3].trim() : 'Unknown',
          reason: match[4] ? match[4].trim() : ''
        });
      }
    });

    return recommendations;
  }

  // Check if recommended books are available in marketplace
  async checkAvailability(recommendations) {
    const enriched = [];

    for (const rec of recommendations) {
      // Search for similar books in marketplace
      const availableBooks = await Book.find({
        $or: [
          { title: new RegExp(rec.title, 'i') },
          { author: new RegExp(rec.author, 'i') }
        ],
        isAvailable: true
      }).limit(3);

      enriched.push({
        ...rec,
        availableInMarketplace: availableBooks.length > 0,
        marketplaceBooks: availableBooks.map(book => ({
          id: book._id,
          title: book.title,
          author: book.author,
          condition: book.condition,
          fixedPrice: book.fixedPrice,
          currentBid: book.currentBid,
          listingTypes: book.listingTypes,
          pdfLink: book.pdfLink
        }))
      });
    }

    return enriched;
  }

  // Get similar books based on a specific book
  async getSimilarBooks(bookId) {
    const book = await Book.findById(bookId);
    if (!book) throw new Error('Book not found');

    const systemPrompt = "You are a book recommendation expert. Suggest similar books based on theme, genre, writing style, or subject matter.";
    const prompt = `${systemPrompt}\n\nFind 5 books similar to "${book.title}" by ${book.author} (${book.category}). ${book.description ? `Description: ${book.description}` : ''}\n\nProvide title, author, genre, and brief reason for each recommendation.`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();
    const recommendations = this.parseRecommendations(aiResponse);
    const enrichedRecommendations = await this.checkAvailability(recommendations);

    return enrichedRecommendations;
  }
}

module.exports = AIRecommendationService;
