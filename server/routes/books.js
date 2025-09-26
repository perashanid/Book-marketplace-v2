const express = require('express');
const { Book, User } = require('../models');
const { authenticateToken, optionalAuth, checkResourceOwnership } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const { createBookSchema, updateBookSchema, searchBooksSchema } = require('../utils/bookValidation');

const router = express.Router();

// Get all books with search and filtering
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = searchBooksSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      });
    }

    const {
      search,
      category,
      condition,
      listingType,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      page,
      limit
    } = value;

    // Build query
    const query = { isAvailable: true };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    // Condition filter
    if (condition) {
      query.condition = condition;
    }

    // Listing type filter
    if (listingType) {
      query.listingType = listingType;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceQuery = {};
      if (minPrice !== undefined) priceQuery.$gte = minPrice;
      if (maxPrice !== undefined) priceQuery.$lte = maxPrice;
      
      // Apply to appropriate price field based on listing type
      query.$or = [];
      if (!listingType || listingType === 'fixed-price') {
        query.$or.push({ listingType: 'fixed-price', fixedPrice: priceQuery });
      }
      if (!listingType || listingType === 'auction') {
        query.$or.push({ listingType: 'auction', currentBid: priceQuery });
      }
      if (!listingType || listingType === 'trade-only') {
        query.$or.push({ listingType: 'trade-only' });
      }
    }

    // Build sort object
    const sort = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [books, totalCount] = await Promise.all([
      Book.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('seller', 'username')
        .lean(),
      Book.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Books fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch books'
      }
    });
  }
});

// Get single book by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('seller', 'username createdAt');

    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOK_NOT_FOUND',
          message: 'Book not found'
        }
      });
    }

    // Check if user is the seller (for additional info)
    const isOwner = req.user && book.seller._id.toString() === req.user._id.toString();

    res.json({
      success: true,
      data: {
        book,
        isOwner
      }
    });
  } catch (error) {
    console.error('Book fetch error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid book ID'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch book'
      }
    });
  }
});

// Create new book listing
router.post('/', authenticateToken, validate(createBookSchema), async (req, res) => {
  try {
    const {
      title,
      author,
      description,
      condition,
      category,
      images,
      pdfLink,
      listingType,
      startingBid,
      auctionDuration,
      fixedPrice,
      acceptsOffers
    } = req.body;

    // Prepare book data
    const bookData = {
      title,
      author,
      description,
      condition,
      category,
      images: images || [],
      pdfLink,
      listingType,
      seller: req.user._id
    };

    // Set type-specific fields
    if (listingType === 'auction') {
      bookData.startingBid = startingBid;
      bookData.currentBid = startingBid;
      bookData.auctionEndTime = new Date(Date.now() + auctionDuration * 24 * 60 * 60 * 1000);
      bookData.isAuctionActive = true;
      if (fixedPrice) {
        bookData.fixedPrice = fixedPrice; // Buy-it-now price
      }
    } else if (listingType === 'fixed-price') {
      bookData.fixedPrice = fixedPrice;
      bookData.acceptsOffers = acceptsOffers !== undefined ? acceptsOffers : true;
    } else if (listingType === 'trade-only') {
      bookData.tradeOnly = true;
    }

    // Create book
    const book = new Book(bookData);
    await book.save();

    // Add book to user's books array
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { books: book._id } }
    );

    // Populate seller info for response
    await book.populate('seller', 'username');

    res.status(201).json({
      success: true,
      data: {
        book
      },
      message: 'Book listing created successfully'
    });
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: 'Failed to create book listing'
      }
    });
  }
});

// Update book listing
router.put('/:id', authenticateToken, checkResourceOwnership('Book'), validate(updateBookSchema), async (req, res) => {
  try {
    const book = req.resource; // Set by checkResourceOwnership middleware

    // Check if book can be updated (not sold, auction not ended)
    if (!book.isAvailable) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BOOK_NOT_AVAILABLE',
          message: 'Cannot update sold or unavailable book'
        }
      });
    }

    if (book.listingType === 'auction' && book.hasAuctionEnded()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AUCTION_ENDED',
          message: 'Cannot update book after auction has ended'
        }
      });
    }

    // Update book
    Object.assign(book, req.body);
    await book.save();

    await book.populate('seller', 'username');

    res.json({
      success: true,
      data: {
        book
      },
      message: 'Book listing updated successfully'
    });
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update book listing'
      }
    });
  }
});

// Delete book listing
router.delete('/:id', authenticateToken, checkResourceOwnership('Book'), async (req, res) => {
  try {
    const book = req.resource;

    // Check if book can be deleted
    if (!book.isAvailable) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BOOK_NOT_AVAILABLE',
          message: 'Cannot delete sold or unavailable book'
        }
      });
    }

    if (book.listingType === 'auction' && book.hasAuctionEnded()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'AUCTION_ENDED',
          message: 'Cannot delete book after auction has ended'
        }
      });
    }

    // Remove book from user's books array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { books: book._id } }
    );

    // Delete book
    await Book.findByIdAndDelete(book._id);

    res.json({
      success: true,
      message: 'Book listing deleted successfully'
    });
  } catch (error) {
    console.error('Book deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETION_ERROR',
        message: 'Failed to delete book listing'
      }
    });
  }
});

// Get user's books
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const [books, totalCount] = await Promise.all([
      Book.find({ seller: userId, isAvailable: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('seller', 'username')
        .lean(),
      Book.countDocuments({ seller: userId, isAvailable: true })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('User books fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch user books'
      }
    });
  }
});

// Get current user's books
router.get('/my-books', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { seller: userId };
    
    if (status === 'available') {
      query.isAvailable = true;
    } else if (status === 'sold') {
      query.isAvailable = false;
    }

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .populate('seller', 'username')
      .select('title author condition category images listingTypes listingType isAvailable createdAt');

    res.json({
      success: true,
      data: {
        books,
        count: books.length
      }
    });
  } catch (error) {
    console.error('Get my books error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch your books'
      }
    });
  }
});

module.exports = router;