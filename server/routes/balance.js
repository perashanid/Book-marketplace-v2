const express = require('express');
const { User, Transaction } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const addFundsSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .max(10000) // Maximum $10,000 per transaction
    .required()
    .messages({
      'number.positive': 'Amount must be positive',
      'number.max': 'Maximum amount per transaction is $10,000',
      'any.required': 'Amount is required'
    }),
  reason: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
});

const transferFundsSchema = Joi.object({
  recipientId: Joi.string()
    .required()
    .messages({
      'any.required': 'Recipient ID is required'
    }),
  amount: Joi.number()
    .positive()
    .max(5000) // Maximum $5,000 per transfer
    .required()
    .messages({
      'number.positive': 'Amount must be positive',
      'number.max': 'Maximum transfer amount is $5,000',
      'any.required': 'Amount is required'
    }),
  reason: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
});

const transactionQuerySchema = Joi.object({
  type: Joi.string()
    .valid('auction', 'fixed-price', 'offer', 'trade', 'deposit', 'withdrawal', 'transfer')
    .allow(''),
  status: Joi.string()
    .valid('pending', 'completed', 'cancelled', 'failed')
    .allow(''),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  sortBy: Joi.string()
    .valid('createdAt', 'completedAt', 'amount', 'type')
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

// Get current user's balance
router.get('/', authenticateToken, async (req, res) => {
  try {
    const balanceService = req.app.get('balanceService');
    const balance = await balanceService.getUserBalance(req.user._id);

    res.json({
      success: true,
      data: {
        balance,
        userId: req.user._id,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BALANCE_ERROR',
        message: 'Failed to fetch balance'
      }
    });
  }
});

// Add funds to user's balance (demo/admin feature)
router.post('/add-funds', authenticateToken, async (req, res) => {
  try {
    const { error, value } = addFundsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { amount, reason } = value;
    const userId = req.user._id;

    const balanceService = req.app.get('balanceService');
    const result = await balanceService.addFunds(
      userId, 
      amount, 
      reason || 'Manual funds addition'
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Funds added successfully'
    });
  } catch (error) {
    console.error('Add funds error:', error);
    
    const errorMessages = {
      'Amount must be positive': { code: 'INVALID_AMOUNT', status: 400 },
      'User not found': { code: 'USER_NOT_FOUND', status: 404 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'ADD_FUNDS_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Transfer funds to another user
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { error, value } = transferFundsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { recipientId, amount, reason } = value;
    const fromUserId = req.user._id;

    const balanceService = req.app.get('balanceService');
    const result = await balanceService.transferFunds(
      fromUserId,
      recipientId,
      amount,
      reason || 'User transfer'
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    console.error('Transfer funds error:', error);
    
    const errorMessages = {
      'Amount must be positive': { code: 'INVALID_AMOUNT', status: 400 },
      'Cannot transfer funds to yourself': { code: 'SELF_TRANSFER', status: 400 },
      'Sender not found': { code: 'SENDER_NOT_FOUND', status: 404 },
      'Recipient not found': { code: 'RECIPIENT_NOT_FOUND', status: 404 },
      'Insufficient balance': { code: 'INSUFFICIENT_FUNDS', status: 400 }
    };

    const errorInfo = errorMessages[error.message] || { code: 'TRANSFER_ERROR', status: 500 };

    res.status(errorInfo.status).json({
      success: false,
      error: {
        code: errorInfo.code,
        message: error.message
      }
    });
  }
});

// Get user's transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { error, value } = transactionQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const userId = req.user._id;
    const balanceService = req.app.get('balanceService');
    const result = await balanceService.getUserTransactions(userId, value);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSACTIONS_ERROR',
        message: 'Failed to fetch transactions'
      }
    });
  }
});

// Get user's balance summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const balanceService = req.app.get('balanceService');
    const summary = await balanceService.getUserBalanceSummary(userId);

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Get balance summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUMMARY_ERROR',
        message: 'Failed to fetch balance summary'
      }
    });
  }
});

// Check if user has sufficient balance for a specific amount
router.post('/check-balance', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be positive'
        }
      });
    }

    const userId = req.user._id;
    const balanceService = req.app.get('balanceService');
    const result = await balanceService.checkSufficientBalance(userId, amount);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Check balance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECK_BALANCE_ERROR',
        message: 'Failed to check balance'
      }
    });
  }
});

// Get recent balance changes
router.get('/recent-changes', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user._id;
    
    const balanceService = req.app.get('balanceService');
    const changes = await balanceService.getRecentBalanceChanges(userId, parseInt(limit));

    res.json({
      success: true,
      data: {
        changes,
        count: changes.length
      }
    });
  } catch (error) {
    console.error('Get recent changes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECENT_CHANGES_ERROR',
        message: 'Failed to fetch recent balance changes'
      }
    });
  }
});

// Get single transaction details
router.get('/transactions/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findById(transactionId)
      .populate('buyer', 'username')
      .populate('seller', 'username')
      .populate('book', 'title author')
      .populate('trade');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    // Check if user is involved in this transaction
    const isBuyer = transaction.buyer && transaction.buyer._id.toString() === userId.toString();
    const isSeller = transaction.seller && transaction.seller._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to view this transaction'
        }
      });
    }

    // Determine user role
    let userRole = 'unknown';
    if (transaction.type === 'transfer') {
      userRole = isBuyer ? 'sender' : 'recipient';
    } else if (transaction.type === 'deposit') {
      userRole = 'recipient';
    } else if (transaction.type === 'withdrawal') {
      userRole = 'sender';
    } else {
      userRole = isBuyer ? 'buyer' : 'seller';
    }

    res.json({
      success: true,
      data: {
        transaction,
        userRole
      }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSACTION_ERROR',
        message: 'Failed to fetch transaction details'
      }
    });
  }
});

module.exports = router;