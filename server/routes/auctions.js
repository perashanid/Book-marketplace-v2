const express = require('express');
const { Book, Bid } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const bidSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Bid amount must be positive',
      'any.required': 'Bid amount is required'
    })
});

// Place a bid on an auction
router.post('/:bookId/bid', authenticateToken, async (req, res) => {
  try {
    // Validate bid amount
    const { error, value } = bidSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { amount } = value;
    const { bookId } = req.params;
    const bidderId = req.user._id;

    // Get auction service from app
    const auctionService = req.app.get('auctionService');
    
    const bid = await auctionService.placeBid(bookId, bidderId, amount);

    res.status(201).json({
      success: true,
      data: {
        bid
      },
      message: 'Bid placed successfully'
    });
  } catch (error) {
    console.error('Bid placement error:', error);
    
    // Handle specific auction errors
    const errorMessages = {
      'Book not found': 'BOOK_NOT_FOUND',
      'This book is not an auction': 'NOT_AUCTION',
      'Auction is not active': 'AUCTION_INACTIVE',
      'Auction has ended': 'AUCTION_ENDED',
      'Cannot bid on your own auction': 'OWN_AUCTION',
      'Insufficient balance': 'INSUFFICIENT_FUNDS',
      'User not found': 'USER_NOT_FOUND'
    };

    const errorCode = errorMessages[error.message] || 'BID_ERROR';
    const statusCode = errorCode === 'BOOK_NOT_FOUND' || errorCode === 'USER_NOT_FOUND' ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message
      }
    });
  }
});

// Get bid history for an auction
router.get('/:bookId/bids', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { limit = 10 } = req.query;

    // Verify book exists and is an auction
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOK_NOT_FOUND',
          message: 'Book not found'
        }
      });
    }

    if (book.listingType !== 'auction') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_AUCTION',
          message: 'This book is not an auction'
        }
      });
    }

    const auctionService = req.app.get('auctionService');
    const bids = await auctionService.getBidHistory(bookId, parseInt(limit));

    res.json({
      success: true,
      data: {
        bids,
        count: bids.length
      }
    });
  } catch (error) {
    console.error('Bid history fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch bid history'
      }
    });
  }
});

// Get auction status
router.get('/:bookId/status', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const auctionService = req.app.get('auctionService');
    const status = await auctionService.getAuctionStatus(bookId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Auction status fetch error:', error);
    
    if (error.message === 'Invalid auction') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_AUCTION',
          message: 'Invalid auction or book not found'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to fetch auction status'
      }
    });
  }
});

// Manually end auction (seller only)
router.post('/:bookId/end', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const sellerId = req.user._id;

    const auctionService = req.app.get('auctionService');
    const result = await auctionService.manuallyEndAuction(bookId, sellerId);

    res.json({
      success: true,
      data: result,
      message: 'Auction ended successfully'
    });
  } catch (error) {
    console.error('Manual auction end error:', error);
    
    const errorMessages = {
      'Book not found': { code: 'BOOK_NOT_FOUND', status: 404 },
      'Only the seller can manually end the auction': { code: 'UNAUTHORIZED', status: 403 },
      'This is not an auction': { code: 'NOT_AUCTION', status: 400 },
      'Auction is already ended': { code: 'AUCTION_ENDED', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'END_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Get user's active bids
router.get('/user/active-bids', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const auctionService = req.app.get('auctionService');
    const activeBids = await auctionService.getUserActiveBids(userId);

    res.json({
      success: true,
      data: {
        activeBids,
        count: activeBids.length
      }
    });
  } catch (error) {
    console.error('Active bids fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch active bids'
      }
    });
  }
});

// Get current highest bid for an auction
router.get('/:bookId/highest-bid', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const auctionService = req.app.get('auctionService');
    const highestBid = await auctionService.getCurrentHighestBid(bookId);

    res.json({
      success: true,
      data: {
        highestBid
      }
    });
  } catch (error) {
    console.error('Highest bid fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch highest bid'
      }
    });
  }
});

module.exports = router;