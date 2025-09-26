const Joi = require('joi');

// Book creation validation schema
const createBookSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(200)
    .required()
    .messages({
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Book title is required'
    }),
  author: Joi.string()
    .trim()
    .max(100)
    .required()
    .messages({
      'string.max': 'Author name cannot exceed 100 characters',
      'any.required': 'Author is required'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  condition: Joi.string()
    .valid('new', 'like-new', 'good', 'fair', 'poor')
    .required()
    .messages({
      'any.only': 'Condition must be one of: new, like-new, good, fair, poor',
      'any.required': 'Book condition is required'
    }),
  category: Joi.string()
    .trim()
    .max(50)
    .allow('')
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  images: Joi.array()
    .items(
      Joi.string().uri().pattern(/\.(jpg|jpeg|png|gif|webp)$/i)
        .messages({
          'string.pattern.base': 'Image must be a valid URL ending with jpg, jpeg, png, gif, or webp'
        })
    )
    .max(5)
    .messages({
      'array.max': 'Maximum 5 images allowed'
    }),
  pdfLink: Joi.string()
    .uri()
    .pattern(/\.pdf$/i)
    .allow('')
    .messages({
      'string.pattern.base': 'PDF link must be a valid URL ending with .pdf'
    }),
  listingType: Joi.string()
    .valid('auction', 'fixed-price', 'trade-only')
    .required()
    .messages({
      'any.only': 'Listing type must be one of: auction, fixed-price, trade-only',
      'any.required': 'Listing type is required'
    }),
  
  // Auction-specific fields
  startingBid: Joi.when('listingType', {
    is: 'auction',
    then: Joi.number().min(0).required().messages({
      'number.min': 'Starting bid cannot be negative',
      'any.required': 'Starting bid is required for auction listings'
    }),
    otherwise: Joi.forbidden()
  }),
  auctionDuration: Joi.when('listingType', {
    is: 'auction',
    then: Joi.number().min(1).max(30).required().messages({
      'number.min': 'Auction duration must be at least 1 day',
      'number.max': 'Auction duration cannot exceed 30 days',
      'any.required': 'Auction duration is required for auction listings'
    }),
    otherwise: Joi.forbidden()
  }),
  
  // Fixed-price fields
  fixedPrice: Joi.when('listingType', {
    is: Joi.valid('fixed-price', 'auction'),
    then: Joi.number().min(0).required().messages({
      'number.min': 'Fixed price cannot be negative',
      'any.required': 'Fixed price is required for fixed-price listings'
    }),
    otherwise: Joi.forbidden()
  }),
  acceptsOffers: Joi.when('listingType', {
    is: 'fixed-price',
    then: Joi.boolean().default(true),
    otherwise: Joi.forbidden()
  })
});

// Book update validation schema (all fields optional)
const updateBookSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(200)
    .messages({
      'string.max': 'Title cannot exceed 200 characters'
    }),
  author: Joi.string()
    .trim()
    .max(100)
    .messages({
      'string.max': 'Author name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
  condition: Joi.string()
    .valid('new', 'like-new', 'good', 'fair', 'poor')
    .messages({
      'any.only': 'Condition must be one of: new, like-new, good, fair, poor'
    }),
  category: Joi.string()
    .trim()
    .max(50)
    .allow('')
    .messages({
      'string.max': 'Category cannot exceed 50 characters'
    }),
  images: Joi.array()
    .items(
      Joi.string().uri().pattern(/\.(jpg|jpeg|png|gif|webp)$/i)
        .messages({
          'string.pattern.base': 'Image must be a valid URL ending with jpg, jpeg, png, gif, or webp'
        })
    )
    .max(5)
    .messages({
      'array.max': 'Maximum 5 images allowed'
    }),
  pdfLink: Joi.string()
    .uri()
    .pattern(/\.pdf$/i)
    .allow('')
    .messages({
      'string.pattern.base': 'PDF link must be a valid URL ending with .pdf'
    }),
  fixedPrice: Joi.number()
    .min(0)
    .messages({
      'number.min': 'Fixed price cannot be negative'
    }),
  acceptsOffers: Joi.boolean()
});

// Search/filter validation schema
const searchBooksSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  category: Joi.string().trim().max(50).allow(''),
  condition: Joi.string().valid('new', 'like-new', 'good', 'fair', 'poor').allow(''),
  listingType: Joi.string().valid('auction', 'fixed-price', 'trade-only').allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sortBy: Joi.string().valid('createdAt', 'title', 'author', 'fixedPrice', 'currentBid', 'auctionEndTime').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

module.exports = {
  createBookSchema,
  updateBookSchema,
  searchBooksSchema
};