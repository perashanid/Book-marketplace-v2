const express = require('express');
const router = express.Router();
const AIRecommendationService = require('../services/aiRecommendationService');
const auth = require('../middleware/auth');
const UserPreference = require('../models/UserPreference');

const aiService = new AIRecommendationService();

// Get AI recommendations based on user activity
router.get('/recommendations', auth, async (req, res) => {
  try {
    const result = await aiService.generateRecommendations(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('AI recommendation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate recommendations',
      error: error.message 
    });
  }
});

// Chat with AI
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    const result = await aiService.chatWithAI(req.user.userId, message);
    res.json(result);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      message: 'Failed to process chat message',
      error: error.message 
    });
  }
});

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const preferences = await aiService.getUserPreferences(req.user.userId);
    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ 
      message: 'Failed to get preferences',
      error: error.message 
    });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { genres, authors, types, priceRange, conditions } = req.body;
    
    const preferences = await aiService.getUserPreferences(req.user.userId);
    
    if (genres) preferences.favoriteGenres = genres;
    if (authors) preferences.favoriteAuthors = authors;
    if (types) preferences.preferredBookTypes = types;
    if (priceRange) preferences.priceRange = priceRange;
    if (conditions) preferences.preferredConditions = conditions;
    
    await preferences.save();
    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ 
      message: 'Failed to update preferences',
      error: error.message 
    });
  }
});

// Get chat history
router.get('/chat/history', auth, async (req, res) => {
  try {
    const preferences = await aiService.getUserPreferences(req.user.userId);
    res.json({ chatHistory: preferences.chatHistory });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ 
      message: 'Failed to get chat history',
      error: error.message 
    });
  }
});

// Clear chat history
router.delete('/chat/history', auth, async (req, res) => {
  try {
    const preferences = await aiService.getUserPreferences(req.user.userId);
    preferences.chatHistory = [];
    await preferences.save();
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ 
      message: 'Failed to clear chat history',
      error: error.message 
    });
  }
});

// Get similar books for a specific book
router.get('/similar/:bookId', auth, async (req, res) => {
  try {
    const recommendations = await aiService.getSimilarBooks(req.params.bookId);
    res.json({ recommendations });
  } catch (error) {
    console.error('Similar books error:', error);
    res.status(500).json({ 
      message: 'Failed to get similar books',
      error: error.message 
    });
  }
});

// Update activity summary
router.post('/update-activity', auth, async (req, res) => {
  try {
    const preferences = await aiService.getUserPreferences(req.user.userId);
    await preferences.updateActivitySummary();
    res.json({ message: 'Activity summary updated', activitySummary: preferences.activitySummary });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ 
      message: 'Failed to update activity summary',
      error: error.message 
    });
  }
});

module.exports = router;
