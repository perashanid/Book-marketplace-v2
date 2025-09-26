const express = require('express');
const { Trade, Book } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const proposeTradeSchema = Joi.object({
  recipientId: Joi.string()
    .required()
    .messages({
      'any.required': 'Recipient ID is required'
    }),
  proposerBookIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one book must be offered',
      'any.required': 'Proposer books are required'
    }),
  recipientBookIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one book must be requested',
      'any.required': 'Recipient books are required'
    }),
  message: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Message cannot exceed 500 characters'
    })
});

const proposeTradeForBookSchema = Joi.object({
  recipientBookId: Joi.string()
    .required()
    .messages({
      'any.required': 'Recipient book ID is required'
    }),
  proposerBookIds: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one book must be offered',
      'any.required': 'Proposer books are required'
    }),
  message: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Message cannot exceed 500 characters'
    })
});

const respondToTradeSchema = Joi.object({
  responseMessage: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Response message cannot exceed 500 characters'
    })
});

// Propose a trade
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if this is a single book trade proposal
    if (req.body.recipientBookId) {
      const { error, value } = proposeTradeForBookSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          }
        });
      }

      const { recipientBookId, proposerBookIds, message } = value;
      const proposerId = req.user._id;

      // Get the recipient book to find the seller
      const recipientBook = await Book.findById(recipientBookId).populate('seller');
      if (!recipientBook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BOOK_NOT_FOUND',
            message: 'Recipient book not found'
          }
        });
      }

      const tradeService = req.app.get('tradeService');
      const trade = await tradeService.proposeTrade(
        proposerId,
        recipientBook.seller._id,
        proposerBookIds,
        [recipientBookId],
        message
      );

      return res.status(201).json({
        success: true,
        data: {
          trade
        },
        message: 'Trade proposal sent successfully'
      });
    }

    // Original multi-book trade proposal
    const { error, value } = proposeTradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { recipientId, proposerBookIds, recipientBookIds, message } = value;
    const proposerId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const trade = await tradeService.proposeTrade(
      proposerId,
      recipientId,
      proposerBookIds,
      recipientBookIds,
      message
    );

    res.status(201).json({
      success: true,
      data: {
        trade
      },
      message: 'Trade proposal sent successfully'
    });
  } catch (error) {
    console.error('Propose trade error:', error);
    
    const errorMessages = {
      'Cannot propose trade with yourself': { code: 'SELF_TRADE', status: 400 },
      'Proposer not found': { code: 'PROPOSER_NOT_FOUND', status: 404 },
      'Recipient not found': { code: 'RECIPIENT_NOT_FOUND', status: 404 },
      'Some of your books are not available or do not belong to you': { code: 'INVALID_PROPOSER_BOOKS', status: 400 },
      'Some of the requested books are not available or do not belong to the recipient': { code: 'INVALID_RECIPIENT_BOOKS', status: 400 },
      'Cannot trade books that are currently in active auctions': { code: 'AUCTION_BOOKS', status: 400 },
      'Cannot request books that are currently in active auctions': { code: 'AUCTION_BOOKS_REQUESTED', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'TRADE_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Accept a trade proposal
router.put('/:tradeId/accept', authenticateToken, async (req, res) => {
  try {
    const { error, value } = respondToTradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { tradeId } = req.params;
    const { responseMessage } = value;
    const recipientId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const result = await tradeService.acceptTrade(tradeId, recipientId, responseMessage);

    res.json({
      success: true,
      data: result,
      message: 'Trade accepted successfully'
    });
  } catch (error) {
    console.error('Accept trade error:', error);
    
    const errorMessages = {
      'Trade proposal not found': { code: 'TRADE_NOT_FOUND', status: 404 },
      'Trade proposal is no longer pending': { code: 'TRADE_NOT_PENDING', status: 400 },
      'Only the recipient can accept this trade': { code: 'UNAUTHORIZED', status: 403 },
      'Some of the proposer\'s books are no longer available': { code: 'PROPOSER_BOOKS_UNAVAILABLE', status: 400 },
      'Some of your books are no longer available': { code: 'RECIPIENT_BOOKS_UNAVAILABLE', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'ACCEPT_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Reject a trade proposal
router.put('/:tradeId/reject', authenticateToken, async (req, res) => {
  try {
    const { error, value } = respondToTradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { tradeId } = req.params;
    const { responseMessage } = value;
    const recipientId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const trade = await tradeService.rejectTrade(tradeId, recipientId, responseMessage);

    res.json({
      success: true,
      data: {
        trade
      },
      message: 'Trade rejected successfully'
    });
  } catch (error) {
    console.error('Reject trade error:', error);
    
    const errorMessages = {
      'Trade proposal not found': { code: 'TRADE_NOT_FOUND', status: 404 },
      'Trade proposal is no longer pending': { code: 'TRADE_NOT_PENDING', status: 400 },
      'Only the recipient can reject this trade': { code: 'UNAUTHORIZED', status: 403 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'REJECT_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Cancel a trade proposal (proposer only)
router.put('/:tradeId/cancel', authenticateToken, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const proposerId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const trade = await tradeService.cancelTrade(tradeId, proposerId);

    res.json({
      success: true,
      data: {
        trade
      },
      message: 'Trade cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel trade error:', error);
    
    const errorMessages = {
      'Trade proposal not found': { code: 'TRADE_NOT_FOUND', status: 404 },
      'Trade proposal is no longer pending': { code: 'TRADE_NOT_PENDING', status: 400 },
      'Only the proposer can cancel this trade': { code: 'UNAUTHORIZED', status: 403 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'CANCEL_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Get user's trades
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const trades = await tradeService.getUserTrades(userId, status);

    res.json({
      success: true,
      data: {
        trades,
        count: trades.length
      }
    });
  } catch (error) {
    console.error('Get user trades error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch user trades'
      }
    });
  }
});

// Get single trade details
router.get('/:tradeId', authenticateToken, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const result = await tradeService.getTradeDetails(tradeId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get trade details error:', error);
    
    const errorMessages = {
      'Trade not found': { code: 'TRADE_NOT_FOUND', status: 404 },
      'You do not have permission to view this trade': { code: 'UNAUTHORIZED', status: 403 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'FETCH_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Get user's tradeable books
router.get('/books/tradeable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's books that are available for trading
    const books = await Book.find({
      seller: userId,
      isAvailable: true,
      $or: [
        { 'listingTypes.tradeOnly': true },
        { listingType: 'trade-only' } // Legacy support
      ]
    }).select('title author condition category images');

    res.json({
      success: true,
      data: {
        books,
        count: books.length
      }
    });
  } catch (error) {
    console.error('Get tradeable books error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch tradeable books'
      }
    });
  }
});

// Get another user's books available for trade
router.get('/books/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const books = await tradeService.getUserBooksForTrade(userId, currentUserId);

    res.json({
      success: true,
      data: {
        books,
        count: books.length
      }
    });
  } catch (error) {
    console.error('Get user books for trade error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch user books for trade'
      }
    });
  }
});

// Get user's trade statistics
router.get('/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const tradeService = req.app.get('tradeService');
    const stats = await tradeService.getUserTradeStats(userId);

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get trade stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch trade statistics'
      }
    });
  }
});

module.exports = router;