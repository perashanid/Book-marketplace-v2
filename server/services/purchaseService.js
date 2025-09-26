const { Book, User, Transaction, Offer } = require('../models');

class PurchaseService {
  constructor(io) {
    this.io = io;
  }

  // Purchase book at fixed price (Buy Now)
  async purchaseBook(bookId, buyerId) {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get book and validate
        const book = await Book.findById(bookId)
          .populate('seller', 'username')
          .session(session);
        
        if (!book) {
          throw new Error('Book not found');
        }

        if (!book.isAvailable) {
          throw new Error('Book is no longer available');
        }

        if (book.listingType === 'trade-only') {
          throw new Error('This book is only available for trade');
        }

        if (book.seller._id.toString() === buyerId.toString()) {
          throw new Error('Cannot purchase your own book');
        }

        // Check if user has sufficient balance
        const buyer = await User.findById(buyerId).session(session);
        if (!buyer) {
          throw new Error('Buyer not found');
        }

        const purchasePrice = book.fixedPrice;
        if (buyer.balance < purchasePrice) {
          throw new Error('Insufficient balance');
        }

        // Create and complete transaction
        const transaction = await Transaction.createFixedPriceTransaction(buyerId, book);
        await transaction.complete();

        // Mark book as sold
        book.isAvailable = false;
        book.soldAt = new Date();
        book.soldTo = buyerId;
        await book.save({ session });

        // Emit notifications
        this.io.to(`user_${book.seller._id}`).emit('book_sold', {
          bookId: book._id,
          bookTitle: book.title,
          soldPrice: purchasePrice,
          buyer: {
            _id: buyer._id,
            username: buyer.username
          },
          transactionId: transaction._id
        });

        this.io.to(`user_${buyerId}`).emit('book_purchased', {
          bookId: book._id,
          bookTitle: book.title,
          purchasePrice: purchasePrice,
          seller: book.seller,
          transactionId: transaction._id
        });

        return {
          book,
          transaction,
          purchasePrice
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Make an offer on a fixed-price book
  async makeOffer(bookId, buyerId, amount, message = '') {
    try {
      // Validate book
      const book = await Book.findById(bookId).populate('seller', 'username');
      if (!book) {
        throw new Error('Book not found');
      }

      if (!book.isAvailable) {
        throw new Error('Book is no longer available');
      }

      if (book.listingType !== 'fixed-price') {
        throw new Error('Offers can only be made on fixed-price books');
      }

      if (!book.acceptsOffers) {
        throw new Error('This book does not accept offers');
      }

      if (book.seller._id.toString() === buyerId.toString()) {
        throw new Error('Cannot make offer on your own book');
      }

      // Check if user has sufficient balance
      const buyer = await User.findById(buyerId);
      if (!buyer) {
        throw new Error('Buyer not found');
      }

      if (buyer.balance < amount) {
        throw new Error('Insufficient balance for this offer');
      }

      // Check for existing pending offer from this user
      const existingOffer = await Offer.findOne({
        book: bookId,
        buyer: buyerId,
        status: 'pending'
      });

      if (existingOffer) {
        throw new Error('You already have a pending offer on this book');
      }

      // Create offer
      const offer = new Offer({
        book: bookId,
        buyer: buyerId,
        amount,
        message: message.trim()
      });

      await offer.save();
      await offer.populate('buyer', 'username');

      // Notify seller
      this.io.to(`user_${book.seller._id}`).emit('offer_received', {
        offerId: offer._id,
        bookId: book._id,
        bookTitle: book.title,
        offerAmount: amount,
        buyer: offer.buyer,
        message: message,
        fixedPrice: book.fixedPrice
      });

      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Accept an offer (seller only)
  async acceptOffer(offerId, sellerId, responseMessage = '') {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get offer and validate
        const offer = await Offer.findById(offerId)
          .populate('buyer', 'username')
          .populate('book')
          .session(session);

        if (!offer) {
          throw new Error('Offer not found');
        }

        if (offer.status !== 'pending') {
          throw new Error('Offer is no longer pending');
        }

        if (offer.hasExpired()) {
          throw new Error('Offer has expired');
        }

        const book = offer.book;
        if (book.seller.toString() !== sellerId.toString()) {
          throw new Error('Only the seller can accept this offer');
        }

        if (!book.isAvailable) {
          throw new Error('Book is no longer available');
        }

        // Check buyer still has sufficient balance
        const buyer = await User.findById(offer.buyer._id).session(session);
        if (buyer.balance < offer.amount) {
          throw new Error('Buyer no longer has sufficient balance');
        }

        // Accept offer
        await offer.accept(responseMessage);

        // Create and complete transaction
        const transaction = await Transaction.createOfferTransaction(offer, book);
        await transaction.complete();

        // Mark book as sold
        book.isAvailable = false;
        book.soldAt = new Date();
        book.soldTo = offer.buyer._id;
        await book.save({ session });

        // Reject all other pending offers for this book
        await Offer.updateMany(
          {
            book: book._id,
            _id: { $ne: offer._id },
            status: 'pending'
          },
          {
            status: 'rejected',
            rejectedAt: new Date(),
            responseMessage: 'Book sold to another buyer'
          },
          { session }
        );

        // Emit notifications
        this.io.to(`user_${offer.buyer._id}`).emit('offer_accepted', {
          offerId: offer._id,
          bookId: book._id,
          bookTitle: book.title,
          acceptedAmount: offer.amount,
          responseMessage,
          transactionId: transaction._id
        });

        this.io.to(`user_${sellerId}`).emit('offer_accepted_seller', {
          offerId: offer._id,
          bookId: book._id,
          bookTitle: book.title,
          soldAmount: offer.amount,
          buyer: offer.buyer,
          transactionId: transaction._id
        });

        return {
          offer,
          book,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Reject an offer (seller only)
  async rejectOffer(offerId, sellerId, responseMessage = '') {
    try {
      const offer = await Offer.findById(offerId)
        .populate('buyer', 'username')
        .populate('book', 'title seller');

      if (!offer) {
        throw new Error('Offer not found');
      }

      if (offer.status !== 'pending') {
        throw new Error('Offer is no longer pending');
      }

      if (offer.book.seller.toString() !== sellerId.toString()) {
        throw new Error('Only the seller can reject this offer');
      }

      // Reject offer
      await offer.reject(responseMessage);

      // Notify buyer
      this.io.to(`user_${offer.buyer._id}`).emit('offer_rejected', {
        offerId: offer._id,
        bookId: offer.book._id,
        bookTitle: offer.book.title,
        rejectedAmount: offer.amount,
        responseMessage
      });

      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Counter offer (seller only)
  async counterOffer(offerId, sellerId, counterAmount, responseMessage = '') {
    try {
      const offer = await Offer.findById(offerId)
        .populate('buyer', 'username')
        .populate('book', 'title seller fixedPrice');

      if (!offer) {
        throw new Error('Offer not found');
      }

      if (offer.status !== 'pending') {
        throw new Error('Offer is no longer pending');
      }

      if (offer.book.seller.toString() !== sellerId.toString()) {
        throw new Error('Only the seller can counter this offer');
      }

      if (counterAmount <= 0) {
        throw new Error('Counter offer amount must be positive');
      }

      if (counterAmount >= offer.book.fixedPrice) {
        throw new Error('Counter offer should be less than the fixed price');
      }

      // Create counter offer
      await offer.counterOffer(counterAmount, responseMessage);

      // Notify buyer
      this.io.to(`user_${offer.buyer._id}`).emit('counter_offer_received', {
        offerId: offer._id,
        bookId: offer.book._id,
        bookTitle: offer.book.title,
        originalAmount: offer.amount,
        counterAmount: counterAmount,
        responseMessage,
        fixedPrice: offer.book.fixedPrice
      });

      return offer;
    } catch (error) {
      throw error;
    }
  }

  // Accept counter offer (buyer only)
  async acceptCounterOffer(offerId, buyerId) {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        const offer = await Offer.findById(offerId)
          .populate('buyer', 'username')
          .populate('book')
          .session(session);

        if (!offer) {
          throw new Error('Offer not found');
        }

        if (offer.status !== 'counter-offered') {
          throw new Error('No counter offer to accept');
        }

        if (offer.buyer._id.toString() !== buyerId.toString()) {
          throw new Error('Only the original buyer can accept the counter offer');
        }

        if (offer.hasExpired()) {
          throw new Error('Counter offer has expired');
        }

        const book = offer.book;
        if (!book.isAvailable) {
          throw new Error('Book is no longer available');
        }

        // Check buyer has sufficient balance for counter offer
        const buyer = await User.findById(buyerId).session(session);
        if (buyer.balance < offer.counterOfferAmount) {
          throw new Error('Insufficient balance for counter offer amount');
        }

        // Update offer amount to counter offer amount and accept
        offer.amount = offer.counterOfferAmount;
        await offer.accept('Counter offer accepted');

        // Create and complete transaction
        const transaction = await Transaction.createOfferTransaction(offer, book);
        await transaction.complete();

        // Mark book as sold
        book.isAvailable = false;
        book.soldAt = new Date();
        book.soldTo = buyerId;
        await book.save({ session });

        // Reject other pending offers
        await Offer.updateMany(
          {
            book: book._id,
            _id: { $ne: offer._id },
            status: { $in: ['pending', 'counter-offered'] }
          },
          {
            status: 'rejected',
            rejectedAt: new Date(),
            responseMessage: 'Book sold to another buyer'
          },
          { session }
        );

        // Emit notifications
        this.io.to(`user_${book.seller}`).emit('counter_offer_accepted', {
          offerId: offer._id,
          bookId: book._id,
          bookTitle: book.title,
          finalAmount: offer.counterOfferAmount,
          buyer: offer.buyer,
          transactionId: transaction._id
        });

        return {
          offer,
          book,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Get offers for a book (seller only)
  async getBookOffers(bookId, sellerId, status = null) {
    try {
      // Verify seller owns the book
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error('Book not found');
      }

      if (book.seller.toString() !== sellerId.toString()) {
        throw new Error('Only the seller can view offers for this book');
      }

      const offers = await Offer.getBookOffers(bookId, status);
      return offers;
    } catch (error) {
      throw error;
    }
  }

  // Get user's offers
  async getUserOffers(userId, status = null) {
    try {
      const offers = await Offer.getUserOffers(userId, status);
      return offers;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PurchaseService;