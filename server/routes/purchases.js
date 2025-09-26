const express = require('express');
const { Book } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const purchaseSchema = Joi.object({
  bookId: Joi.string()
    .required()
    .messages({
      'any.required': 'Book ID is required'
    })
});

// Purchase book at fixed price (buy-now)
router.post('/buy-now', authenticateToken, async (req, res) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { bookId } = value;
    const buyerId = req.user._id;

    const purchaseService = req.app.get('purchaseService');
    const result = await purchaseService.purchaseBook(bookId, buyerId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Book purchased successfully'
    });
  } catch (error) {
    console.error('Purchase error:', error);
    
    const errorMessages = {
      'Book not found': { code: 'BOOK_NOT_FOUND', status: 404 },
      'Book is no longer available': { code: 'BOOK_UNAVAILABLE', status: 400 },
      'This book is only available for trade': { code: 'TRADE_ONLY', status: 400 },
      'Cannot purchase your own book': { code: 'OWN_BOOK', status: 400 },
      'Buyer not found': { code: 'BUYER_NOT_FOUND', status: 404 },
      'Insufficient balance': { code: 'INSUFFICIENT_FUNDS', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'PURCHASE_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Purchase book at fixed price
router.post('/buy', authenticateToken, async (req, res) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { bookId } = value;
    const buyerId = req.user._id;

    const purchaseService = req.app.get('purchaseService');
    const result = await purchaseService.purchaseBook(bookId, buyerId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Book purchased successfully'
    });
  } catch (error) {
    console.error('Purchase error:', error);
    
    const errorMessages = {
      'Book not found': { code: 'BOOK_NOT_FOUND', status: 404 },
      'Book is no longer available': { code: 'BOOK_UNAVAILABLE', status: 400 },
      'This book is only available for trade': { code: 'TRADE_ONLY', status: 400 },
      'Cannot purchase your own book': { code: 'OWN_BOOK', status: 400 },
      'Buyer not found': { code: 'BUYER_NOT_FOUND', status: 404 },
      'Insufficient balance': { code: 'INSUFFICIENT_FUNDS', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'PURCHASE_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

module.exports = router;