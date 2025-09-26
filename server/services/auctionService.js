const { Book, Bid, Transaction, User } = require('../models');
const cron = require('node-cron');

class AuctionService {
  constructor(io) {
    this.io = io;
    this.initializeAuctionScheduler();
  }

  // Initialize cron job to check for ended auctions every minute
  initializeAuctionScheduler() {
    cron.schedule('* * * * *', async () => {
      try {
        await this.processEndedAuctions();
      } catch (error) {
        console.error('Auction scheduler error:', error);
      }
    });
    
    console.log('Auction scheduler initialized');
  }

  // Process all auctions that have ended
  async processEndedAuctions() {
    try {
      const endedAuctions = await Book.find({
        listingType: 'auction',
        isAuctionActive: true,
        auctionEndTime: { $lte: new Date() }
      }).populate('seller', 'username');

      for (const auction of endedAuctions) {
        await this.endAuction(auction._id);
      }
    } catch (error) {
      console.error('Error processing ended auctions:', error);
    }
  }

  // Place a bid on an auction
  async placeBid(bookId, bidderId, amount) {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get book and validate auction
        const book = await Book.findById(bookId).session(session);
        if (!book) {
          throw new Error('Book not found');
        }

        if (book.listingType !== 'auction') {
          throw new Error('This book is not an auction');
        }

        if (!book.isAuctionActive) {
          throw new Error('Auction is not active');
        }

        if (book.hasAuctionEnded()) {
          throw new Error('Auction has ended');
        }

        if (book.seller.toString() === bidderId.toString()) {
          throw new Error('Cannot bid on your own auction');
        }

        // Check if bid amount is valid
        if (amount <= book.currentBid) {
          throw new Error(`Bid must be higher than current bid of ${book.currentBid}`);
        }

        // Check if user has sufficient balance
        const user = await User.findById(bidderId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        if (user.balance < amount) {
          throw new Error('Insufficient balance');
        }

        // Create new bid
        const bid = new Bid({
          book: bookId,
          bidder: bidderId,
          amount: amount
        });

        await bid.save({ session });

        // Update book's current bid and set this bid as winning
        await Book.findByIdAndUpdate(
          bookId,
          { currentBid: amount },
          { session }
        );

        // Set all previous bids as not winning
        await Bid.updateMany(
          { book: bookId, _id: { $ne: bid._id } },
          { isWinning: false },
          { session }
        );

        // Set this bid as winning
        bid.isWinning = true;
        await bid.save({ session });

        // Populate bidder info
        await bid.populate('bidder', 'username');

        // Emit real-time update
        this.io.to(`auction_${bookId}`).emit('bid_update', {
          bookId,
          newBid: {
            _id: bid._id,
            amount: bid.amount,
            bidder: bid.bidder,
            timestamp: bid.timestamp
          },
          currentBid: amount
        });

        // Notify previous highest bidder (if any)
        const previousHighestBid = await Bid.findOne({
          book: bookId,
          _id: { $ne: bid._id }
        })
        .sort({ amount: -1 })
        .populate('bidder', 'username');

        if (previousHighestBid) {
          this.io.to(`user_${previousHighestBid.bidder._id}`).emit('outbid_notification', {
            bookId,
            bookTitle: book.title,
            previousBid: previousHighestBid.amount,
            newBid: amount,
            newBidder: bid.bidder.username
          });
        }

        return bid;
      });
    } finally {
      await session.endSession();
    }
  }

  // End an auction
  async endAuction(bookId) {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get book
        const book = await Book.findById(bookId)
          .populate('seller', 'username')
          .session(session);
        
        if (!book || book.listingType !== 'auction') {
          throw new Error('Invalid auction');
        }

        // Get winning bid
        const winningBid = await Bid.findOne({
          book: bookId,
          isWinning: true
        })
        .populate('bidder', 'username')
        .session(session);

        // End the auction
        book.isAuctionActive = false;
        book.isAvailable = false;
        await book.save({ session });

        let transaction = null;

        if (winningBid) {
          // Create transaction for the winning bid
          transaction = await Transaction.createAuctionTransaction(winningBid, book);
          await transaction.complete();

          // Emit auction ended event with winner
          this.io.to(`auction_${bookId}`).emit('auction_ended', {
            bookId,
            bookTitle: book.title,
            winningBid: {
              amount: winningBid.amount,
              bidder: winningBid.bidder
            },
            seller: book.seller
          });

          // Notify winner
          this.io.to(`user_${winningBid.bidder._id}`).emit('auction_won', {
            bookId,
            bookTitle: book.title,
            winningAmount: winningBid.amount,
            seller: book.seller
          });

          // Notify seller
          this.io.to(`user_${book.seller._id}`).emit('auction_sold', {
            bookId,
            bookTitle: book.title,
            soldAmount: winningBid.amount,
            buyer: winningBid.bidder
          });
        } else {
          // No bids - auction ended without winner
          this.io.to(`auction_${bookId}`).emit('auction_ended', {
            bookId,
            bookTitle: book.title,
            winningBid: null,
            seller: book.seller
          });

          // Notify seller
          this.io.to(`user_${book.seller._id}`).emit('auction_no_bids', {
            bookId,
            bookTitle: book.title
          });
        }

        return {
          book,
          winningBid,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Get bid history for an auction
  async getBidHistory(bookId, limit = 10) {
    try {
      const bids = await Bid.find({ book: bookId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('bidder', 'username');

      return bids;
    } catch (error) {
      throw new Error('Failed to fetch bid history');
    }
  }

  // Get current highest bid for an auction
  async getCurrentHighestBid(bookId) {
    try {
      const highestBid = await Bid.findOne({ book: bookId })
        .sort({ amount: -1 })
        .populate('bidder', 'username');

      return highestBid;
    } catch (error) {
      throw new Error('Failed to fetch highest bid');
    }
  }

  // Check auction status
  async getAuctionStatus(bookId) {
    try {
      const book = await Book.findById(bookId);
      if (!book || book.listingType !== 'auction') {
        throw new Error('Invalid auction');
      }

      const now = new Date();
      const timeRemaining = book.auctionEndTime - now;
      const hasEnded = timeRemaining <= 0;

      const highestBid = await this.getCurrentHighestBid(bookId);
      const bidCount = await Bid.countDocuments({ book: bookId });

      return {
        bookId,
        isActive: book.isAuctionActive && !hasEnded,
        hasEnded,
        timeRemaining: Math.max(0, timeRemaining),
        auctionEndTime: book.auctionEndTime,
        currentBid: book.currentBid,
        startingBid: book.startingBid,
        highestBid,
        bidCount
      };
    } catch (error) {
      throw new Error('Failed to get auction status');
    }
  }

  // Get user's active bids
  async getUserActiveBids(userId) {
    try {
      const activeBids = await Bid.aggregate([
        {
          $match: { bidder: require('mongoose').Types.ObjectId(userId) }
        },
        {
          $lookup: {
            from: 'books',
            localField: 'book',
            foreignField: '_id',
            as: 'bookInfo'
          }
        },
        {
          $unwind: '$bookInfo'
        },
        {
          $match: {
            'bookInfo.isAuctionActive': true,
            'bookInfo.auctionEndTime': { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: '$book',
            highestBid: { $max: '$amount' },
            userHighestBid: { $max: '$amount' },
            bookInfo: { $first: '$bookInfo' },
            isWinning: { $max: '$isWinning' }
          }
        },
        {
          $lookup: {
            from: 'bids',
            let: { bookId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$book', '$$bookId'] }
                }
              },
              {
                $sort: { amount: -1 }
              },
              {
                $limit: 1
              }
            ],
            as: 'currentHighestBid'
          }
        },
        {
          $addFields: {
            isCurrentlyWinning: {
              $eq: ['$userHighestBid', { $arrayElemAt: ['$currentHighestBid.amount', 0] }]
            }
          }
        },
        {
          $sort: { 'bookInfo.auctionEndTime': 1 }
        }
      ]);

      return activeBids;
    } catch (error) {
      throw new Error('Failed to fetch user active bids');
    }
  }

  // Manually end auction (seller only, emergency)
  async manuallyEndAuction(bookId, sellerId) {
    try {
      const book = await Book.findById(bookId);
      
      if (!book) {
        throw new Error('Book not found');
      }

      if (book.seller.toString() !== sellerId.toString()) {
        throw new Error('Only the seller can manually end the auction');
      }

      if (book.listingType !== 'auction') {
        throw new Error('This is not an auction');
      }

      if (!book.isAuctionActive) {
        throw new Error('Auction is already ended');
      }

      return await this.endAuction(bookId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuctionService;