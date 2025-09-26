const express = require('express');
const { Offer, Book } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const makeOfferSchema = Joi.object({
    bookId: Joi.string()
        .required()
        .messages({
            'any.required': 'Book ID is required'
        }),
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'Offer amount must be positive',
            'any.required': 'Offer amount is required'
        }),
    message: Joi.string()
        .max(300)
        .allow('')
        .messages({
            'string.max': 'Message cannot exceed 300 characters'
        })
});

const respondToOfferSchema = Joi.object({
    responseMessage: Joi.string()
        .max(300)
        .allow('')
        .messages({
            'string.max': 'Response message cannot exceed 300 characters'
        })
});

const counterOfferSchema = Joi.object({
    counterAmount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'Counter offer amount must be positive',
            'any.required': 'Counter offer amount is required'
        }),
    responseMessage: Joi.string()
        .max(300)
        .allow('')
        .messages({
            'string.max': 'Response message cannot exceed 300 characters'
        })
});

// Make an offer on a book
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { error, value } = makeOfferSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const { bookId, amount, message } = value;
        const buyerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const offer = await purchaseService.makeOffer(bookId, buyerId, amount, message);

        res.status(201).json({
            success: true,
            data: {
                offer
            },
            message: 'Offer submitted successfully'
        });
    } catch (error) {
        console.error('Make offer error:', error);

        const errorMessages = {
            'Book not found': { code: 'BOOK_NOT_FOUND', status: 404 },
            'Book is no longer available': { code: 'BOOK_UNAVAILABLE', status: 400 },
            'Offers can only be made on fixed-price books': { code: 'INVALID_LISTING_TYPE', status: 400 },
            'This book does not accept offers': { code: 'OFFERS_NOT_ACCEPTED', status: 400 },
            'Cannot make offer on your own book': { code: 'OWN_BOOK', status: 400 },
            'Buyer not found': { code: 'BUYER_NOT_FOUND', status: 404 },
            'Insufficient balance for this offer': { code: 'INSUFFICIENT_FUNDS', status: 400 },
            'You already have a pending offer on this book': { code: 'DUPLICATE_OFFER', status: 400 }
        };

        const errorInfo = errorMessages[error.message] || { code: 'OFFER_ERROR', status: 500 };

        res.status(errorInfo.status).json({
            success: false,
            error: {
                code: errorInfo.code,
                message: error.message
            }
        });
    }
});

// Accept an offer (seller only)
router.put('/:offerId/accept', authenticateToken, async (req, res) => {
    try {
        const { error, value } = respondToOfferSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const { offerId } = req.params;
        const { responseMessage } = value;
        const sellerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const result = await purchaseService.acceptOffer(offerId, sellerId, responseMessage);

        res.json({
            success: true,
            data: result,
            message: 'Offer accepted successfully'
        });
    } catch (error) {
        console.error('Accept offer error:', error);

        const errorMessages = {
            'Offer not found': { code: 'OFFER_NOT_FOUND', status: 404 },
            'Offer is no longer pending': { code: 'OFFER_NOT_PENDING', status: 400 },
            'Offer has expired': { code: 'OFFER_EXPIRED', status: 400 },
            'Only the seller can accept this offer': { code: 'UNAUTHORIZED', status: 403 },
            'Book is no longer available': { code: 'BOOK_UNAVAILABLE', status: 400 },
            'Buyer no longer has sufficient balance': { code: 'BUYER_INSUFFICIENT_FUNDS', status: 400 }
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

// Reject an offer (seller only)
router.put('/:offerId/reject', authenticateToken, async (req, res) => {
    try {
        const { error, value } = respondToOfferSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const { offerId } = req.params;
        const { responseMessage } = value;
        const sellerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const offer = await purchaseService.rejectOffer(offerId, sellerId, responseMessage);

        res.json({
            success: true,
            data: {
                offer
            },
            message: 'Offer rejected successfully'
        });
    } catch (error) {
        console.error('Reject offer error:', error);

        const errorMessages = {
            'Offer not found': { code: 'OFFER_NOT_FOUND', status: 404 },
            'Offer is no longer pending': { code: 'OFFER_NOT_PENDING', status: 400 },
            'Only the seller can reject this offer': { code: 'UNAUTHORIZED', status: 403 }
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

// Counter offer (seller only)
router.put('/:offerId/counter', authenticateToken, async (req, res) => {
    try {
        const { error, value } = counterOfferSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const { offerId } = req.params;
        const { counterAmount, responseMessage } = value;
        const sellerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const offer = await purchaseService.counterOffer(offerId, sellerId, counterAmount, responseMessage);

        res.json({
            success: true,
            data: {
                offer
            },
            message: 'Counter offer sent successfully'
        });
    } catch (error) {
        console.error('Counter offer error:', error);

        const errorMessages = {
            'Offer not found': { code: 'OFFER_NOT_FOUND', status: 404 },
            'Offer is no longer pending': { code: 'OFFER_NOT_PENDING', status: 400 },
            'Only the seller can counter this offer': { code: 'UNAUTHORIZED', status: 403 },
            'Counter offer amount must be positive': { code: 'INVALID_AMOUNT', status: 400 },
            'Counter offer should be less than the fixed price': { code: 'COUNTER_TOO_HIGH', status: 400 }
        };

        const errorInfo = errorMessages[error.message] || { code: 'COUNTER_ERROR', status: 500 };

        res.status(errorInfo.status).json({
            success: false,
            error: {
                code: errorInfo.code,
                message: error.message
            }
        });
    }
});

// Accept counter offer (buyer only)
router.put('/:offerId/accept-counter', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const buyerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const result = await purchaseService.acceptCounterOffer(offerId, buyerId);

        res.json({
            success: true,
            data: result,
            message: 'Counter offer accepted successfully'
        });
    } catch (error) {
        console.error('Accept counter offer error:', error);

        const errorMessages = {
            'Offer not found': { code: 'OFFER_NOT_FOUND', status: 404 },
            'No counter offer to accept': { code: 'NO_COUNTER_OFFER', status: 400 },
            'Only the original buyer can accept the counter offer': { code: 'UNAUTHORIZED', status: 403 },
            'Counter offer has expired': { code: 'OFFER_EXPIRED', status: 400 },
            'Book is no longer available': { code: 'BOOK_UNAVAILABLE', status: 400 },
            'Insufficient balance for counter offer amount': { code: 'INSUFFICIENT_FUNDS', status: 400 }
        };

        const errorInfo = errorMessages[error.message] || { code: 'ACCEPT_COUNTER_ERROR', status: 500 };

        res.status(errorInfo.status).json({
            success: false,
            error: {
                code: errorInfo.code,
                message: error.message
            }
        });
    }
});

// Get offers for a book (seller only)
router.get('/book/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { status } = req.query;
        const sellerId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const offers = await purchaseService.getBookOffers(bookId, sellerId, status);

        res.json({
            success: true,
            data: {
                offers,
                count: offers.length
            }
        });
    } catch (error) {
        console.error('Get book offers error:', error);

        const errorMessages = {
            'Book not found': { code: 'BOOK_NOT_FOUND', status: 404 },
            'Only the seller can view offers for this book': { code: 'UNAUTHORIZED', status: 403 }
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

// Get user's offers
router.get('/user', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        const userId = req.user._id;

        const purchaseService = req.app.get('purchaseService');
        const offers = await purchaseService.getUserOffers(userId, status);

        res.json({
            success: true,
            data: {
                offers,
                count: offers.length
            }
        });
    } catch (error) {
        console.error('Get user offers error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch user offers'
            }
        });
    }
});

// Get single offer details
router.get('/:offerId', authenticateToken, async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user._id;

        const offer = await Offer.findById(offerId)
            .populate('buyer', 'username')
            .populate('book', 'title author fixedPrice seller')
            .populate({
                path: 'book',
                populate: {
                    path: 'seller',
                    select: 'username'
                }
            });

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'OFFER_NOT_FOUND',
                    message: 'Offer not found'
                }
            });
        }

        // Check if user is involved in this offer (buyer or seller)
        const isBuyer = offer.buyer._id.toString() === userId.toString();
        const isSeller = offer.book.seller._id.toString() === userId.toString();

        if (!isBuyer && !isSeller) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'You do not have permission to view this offer'
                }
            });
        }

        res.json({
            success: true,
            data: {
                offer,
                userRole: isBuyer ? 'buyer' : 'seller'
            }
        });
    } catch (error) {
        console.error('Get offer error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch offer details'
            }
        });
    }
});

module.exports = router;