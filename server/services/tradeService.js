const { Trade, Book, User, Transaction } = require('../models');

class TradeService {
  constructor(io) {
    this.io = io;
  }

  // Propose a trade
  async proposeTrade(proposerId, recipientId, proposerBookIds, recipientBookIds, message = '') {
    try {
      // Validate users are different
      if (proposerId.toString() === recipientId.toString()) {
        throw new Error('Cannot propose trade with yourself');
      }

      // Validate users exist
      const [proposer, recipient] = await Promise.all([
        User.findById(proposerId),
        User.findById(recipientId)
      ]);

      if (!proposer) {
        throw new Error('Proposer not found');
      }
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Validate books exist and belong to correct users
      const [proposerBooks, recipientBooks] = await Promise.all([
        Book.find({
          _id: { $in: proposerBookIds },
          seller: proposerId,
          isAvailable: true
        }),
        Book.find({
          _id: { $in: recipientBookIds },
          seller: recipientId,
          isAvailable: true
        })
      ]);

      if (proposerBooks.length !== proposerBookIds.length) {
        throw new Error('Some of your books are not available or do not belong to you');
      }

      if (recipientBooks.length !== recipientBookIds.length) {
        throw new Error('Some of the requested books are not available or do not belong to the recipient');
      }

      // Check if books are tradeable (not auction or sold)
      const nonTradeableProposerBooks = proposerBooks.filter(book => 
        book.listingType === 'auction' && book.isAuctionActive
      );
      const nonTradeableRecipientBooks = recipientBooks.filter(book => 
        book.listingType === 'auction' && book.isAuctionActive
      );

      if (nonTradeableProposerBooks.length > 0) {
        throw new Error('Cannot trade books that are currently in active auctions');
      }

      if (nonTradeableRecipientBooks.length > 0) {
        throw new Error('Cannot request books that are currently in active auctions');
      }

      // Create trade proposal
      const trade = new Trade({
        proposer: proposerId,
        recipient: recipientId,
        proposerBooks: proposerBookIds,
        recipientBooks: recipientBookIds,
        message: message.trim()
      });

      await trade.save();

      // Populate trade data for response
      await trade.populate([
        { path: 'proposer', select: 'username' },
        { path: 'recipient', select: 'username' },
        { path: 'proposerBooks', select: 'title author condition images' },
        { path: 'recipientBooks', select: 'title author condition images' }
      ]);

      // Notify recipient
      this.io.to(`user_${recipientId}`).emit('trade_proposal_received', {
        tradeId: trade._id,
        proposer: trade.proposer,
        proposerBooks: trade.proposerBooks,
        recipientBooks: trade.recipientBooks,
        message: trade.message,
        createdAt: trade.createdAt
      });

      return trade;
    } catch (error) {
      throw error;
    }
  }

  // Accept a trade proposal
  async acceptTrade(tradeId, recipientId, responseMessage = '') {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get trade and validate
        const trade = await Trade.findById(tradeId)
          .populate('proposer', 'username')
          .populate('recipient', 'username')
          .populate('proposerBooks', 'title author seller isAvailable')
          .populate('recipientBooks', 'title author seller isAvailable')
          .session(session);

        if (!trade) {
          throw new Error('Trade proposal not found');
        }

        if (trade.status !== 'pending') {
          throw new Error('Trade proposal is no longer pending');
        }

        if (trade.recipient._id.toString() !== recipientId.toString()) {
          throw new Error('Only the recipient can accept this trade');
        }

        // Verify all books are still available
        const unavailableProposerBooks = trade.proposerBooks.filter(book => !book.isAvailable);
        const unavailableRecipientBooks = trade.recipientBooks.filter(book => !book.isAvailable);

        if (unavailableProposerBooks.length > 0) {
          throw new Error('Some of the proposer\'s books are no longer available');
        }

        if (unavailableRecipientBooks.length > 0) {
          throw new Error('Some of your books are no longer available');
        }

        // Accept the trade
        await trade.accept(responseMessage);

        // Complete the trade (transfer ownership)
        await trade.complete();

        // Create transaction record
        const transaction = await Transaction.createTradeTransaction(trade);
        await transaction.complete();

        // Emit notifications
        this.io.to(`user_${trade.proposer._id}`).emit('trade_accepted', {
          tradeId: trade._id,
          recipient: trade.recipient,
          proposerBooks: trade.proposerBooks,
          recipientBooks: trade.recipientBooks,
          responseMessage,
          transactionId: transaction._id
        });

        this.io.to(`user_${recipientId}`).emit('trade_completed', {
          tradeId: trade._id,
          proposer: trade.proposer,
          proposerBooks: trade.proposerBooks,
          recipientBooks: trade.recipientBooks,
          transactionId: transaction._id
        });

        return {
          trade,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Reject a trade proposal
  async rejectTrade(tradeId, recipientId, responseMessage = '') {
    try {
      const trade = await Trade.findById(tradeId)
        .populate('proposer', 'username')
        .populate('recipient', 'username')
        .populate('proposerBooks', 'title author')
        .populate('recipientBooks', 'title author');

      if (!trade) {
        throw new Error('Trade proposal not found');
      }

      if (trade.status !== 'pending') {
        throw new Error('Trade proposal is no longer pending');
      }

      if (trade.recipient._id.toString() !== recipientId.toString()) {
        throw new Error('Only the recipient can reject this trade');
      }

      // Reject the trade
      await trade.reject(responseMessage);

      // Notify proposer
      this.io.to(`user_${trade.proposer._id}`).emit('trade_rejected', {
        tradeId: trade._id,
        recipient: trade.recipient,
        proposerBooks: trade.proposerBooks,
        recipientBooks: trade.recipientBooks,
        responseMessage
      });

      return trade;
    } catch (error) {
      throw error;
    }
  }

  // Cancel a trade proposal (proposer only)
  async cancelTrade(tradeId, proposerId) {
    try {
      const trade = await Trade.findById(tradeId)
        .populate('proposer', 'username')
        .populate('recipient', 'username')
        .populate('proposerBooks', 'title author')
        .populate('recipientBooks', 'title author');

      if (!trade) {
        throw new Error('Trade proposal not found');
      }

      if (trade.status !== 'pending') {
        throw new Error('Trade proposal is no longer pending');
      }

      if (trade.proposer._id.toString() !== proposerId.toString()) {
        throw new Error('Only the proposer can cancel this trade');
      }

      // Cancel the trade
      trade.status = 'cancelled';
      await trade.save();

      // Notify recipient
      this.io.to(`user_${trade.recipient._id}`).emit('trade_cancelled', {
        tradeId: trade._id,
        proposer: trade.proposer,
        proposerBooks: trade.proposerBooks,
        recipientBooks: trade.recipientBooks
      });

      return trade;
    } catch (error) {
      throw error;
    }
  }

  // Get user's trades (both sent and received)
  async getUserTrades(userId, status = null) {
    try {
      const trades = await Trade.getUserTrades(userId, status);
      
      // Add role information for each trade
      const tradesWithRole = trades.map(trade => ({
        ...trade.toObject(),
        userRole: trade.proposer._id.toString() === userId.toString() ? 'proposer' : 'recipient'
      }));

      return tradesWithRole;
    } catch (error) {
      throw error;
    }
  }

  // Get single trade details
  async getTradeDetails(tradeId, userId) {
    try {
      const trade = await Trade.findById(tradeId)
        .populate('proposer', 'username')
        .populate('recipient', 'username')
        .populate('proposerBooks', 'title author condition images')
        .populate('recipientBooks', 'title author condition images');

      if (!trade) {
        throw new Error('Trade not found');
      }

      // Check if user is involved in this trade
      const isProposer = trade.proposer._id.toString() === userId.toString();
      const isRecipient = trade.recipient._id.toString() === userId.toString();

      if (!isProposer && !isRecipient) {
        throw new Error('You do not have permission to view this trade');
      }

      return {
        trade,
        userRole: isProposer ? 'proposer' : 'recipient'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get available books for trading (user's own books that can be traded)
  async getTradeableBooks(userId) {
    try {
      const books = await Book.find({
        seller: userId,
        isAvailable: true,
        $or: [
          { listingType: 'trade-only' },
          { listingType: 'fixed-price' },
          { 
            listingType: 'auction',
            isAuctionActive: false
          }
        ]
      }).select('title author condition images listingType fixedPrice');

      return books;
    } catch (error) {
      throw error;
    }
  }

  // Get user's books that others might want to trade for
  async getUserBooksForTrade(userId, excludeUserId = null) {
    try {
      const query = {
        seller: userId,
        isAvailable: true,
        $or: [
          { listingType: 'trade-only' },
          { listingType: 'fixed-price' },
          { 
            listingType: 'auction',
            isAuctionActive: false
          }
        ]
      };

      const books = await Book.find(query)
        .select('title author condition images listingType fixedPrice')
        .populate('seller', 'username');

      return books;
    } catch (error) {
      throw error;
    }
  }

  // Get trade statistics for a user
  async getUserTradeStats(userId) {
    try {
      const stats = await Trade.aggregate([
        {
          $match: {
            $or: [
              { proposer: require('mongoose').Types.ObjectId(userId) },
              { recipient: require('mongoose').Types.ObjectId(userId) }
            ]
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statsObject = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      stats.forEach(stat => {
        statsObject[stat._id] = stat.count;
        statsObject.total += stat.count;
      });

      return statsObject;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TradeService;