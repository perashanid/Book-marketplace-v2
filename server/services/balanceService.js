const { User, Transaction } = require('../models');

class BalanceService {
  constructor(io) {
    this.io = io;
  }

  // Get user's current balance
  async getUserBalance(userId) {
    try {
      const user = await User.findById(userId).select('balance');
      if (!user) {
        throw new Error('User not found');
      }
      return user.balance;
    } catch (error) {
      throw error;
    }
  }

  // Add funds to user's balance (for demo purposes or admin actions)
  async addFunds(userId, amount, reason = 'Funds added') {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        if (amount <= 0) {
          throw new Error('Amount must be positive');
        }

        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        const previousBalance = user.balance;
        user.balance += amount;
        await user.save({ session });

        // Create transaction record
        const transaction = new Transaction({
          type: 'deposit',
          seller: userId, // Using seller field for the user receiving funds
          amount: amount,
          status: 'completed',
          notes: reason,
          completedAt: new Date()
        });
        await transaction.save({ session });

        // Emit balance update notification
        this.io.to(`user_${userId}`).emit('balance_updated', {
          previousBalance,
          newBalance: user.balance,
          change: amount,
          reason,
          transactionId: transaction._id
        });

        return {
          previousBalance,
          newBalance: user.balance,
          amountAdded: amount,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Deduct funds from user's balance (internal use)
  async deductFunds(userId, amount, reason = 'Funds deducted') {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        if (amount <= 0) {
          throw new Error('Amount must be positive');
        }

        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }

        if (user.balance < amount) {
          throw new Error('Insufficient balance');
        }

        const previousBalance = user.balance;
        user.balance -= amount;
        await user.save({ session });

        // Create transaction record
        const transaction = new Transaction({
          type: 'withdrawal',
          buyer: userId, // Using buyer field for the user losing funds
          amount: amount,
          status: 'completed',
          notes: reason,
          completedAt: new Date()
        });
        await transaction.save({ session });

        // Emit balance update notification
        this.io.to(`user_${userId}`).emit('balance_updated', {
          previousBalance,
          newBalance: user.balance,
          change: -amount,
          reason,
          transactionId: transaction._id
        });

        return {
          previousBalance,
          newBalance: user.balance,
          amountDeducted: amount,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Transfer funds between users (internal use)
  async transferFunds(fromUserId, toUserId, amount, reason = 'Fund transfer') {
    const session = await require('mongoose').startSession();
    
    try {
      return await session.withTransaction(async () => {
        if (amount <= 0) {
          throw new Error('Amount must be positive');
        }

        if (fromUserId.toString() === toUserId.toString()) {
          throw new Error('Cannot transfer funds to yourself');
        }

        // Get both users
        const [fromUser, toUser] = await Promise.all([
          User.findById(fromUserId).session(session),
          User.findById(toUserId).session(session)
        ]);

        if (!fromUser) {
          throw new Error('Sender not found');
        }
        if (!toUser) {
          throw new Error('Recipient not found');
        }

        if (fromUser.balance < amount) {
          throw new Error('Insufficient balance');
        }

        // Update balances
        const fromPreviousBalance = fromUser.balance;
        const toPreviousBalance = toUser.balance;

        fromUser.balance -= amount;
        toUser.balance += amount;

        await Promise.all([
          fromUser.save({ session }),
          toUser.save({ session })
        ]);

        // Create transaction record
        const transaction = new Transaction({
          type: 'transfer',
          buyer: fromUserId,
          seller: toUserId,
          amount: amount,
          status: 'completed',
          notes: reason,
          completedAt: new Date()
        });
        await transaction.save({ session });

        // Emit balance update notifications
        this.io.to(`user_${fromUserId}`).emit('balance_updated', {
          previousBalance: fromPreviousBalance,
          newBalance: fromUser.balance,
          change: -amount,
          reason: `Transfer to ${toUser.username}`,
          transactionId: transaction._id
        });

        this.io.to(`user_${toUserId}`).emit('balance_updated', {
          previousBalance: toPreviousBalance,
          newBalance: toUser.balance,
          change: amount,
          reason: `Transfer from ${fromUser.username}`,
          transactionId: transaction._id
        });

        return {
          fromUser: {
            previousBalance: fromPreviousBalance,
            newBalance: fromUser.balance
          },
          toUser: {
            previousBalance: toPreviousBalance,
            newBalance: toUser.balance
          },
          amount,
          transaction
        };
      });
    } finally {
      await session.endSession();
    }
  }

  // Get user's transaction history
  async getUserTransactions(userId, options = {}) {
    try {
      const {
        type = null,
        status = null,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {
        $or: [
          { buyer: userId },
          { seller: userId }
        ]
      };

      if (type) {
        query.type = type;
      }

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [transactions, totalCount] = await Promise.all([
        Transaction.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('buyer', 'username')
          .populate('seller', 'username')
          .populate('book', 'title author')
          .populate('trade')
          .lean(),
        Transaction.countDocuments(query)
      ]);

      // Add user role and transaction direction for each transaction
      const transactionsWithRole = transactions.map(transaction => {
        const isBuyer = transaction.buyer && transaction.buyer._id.toString() === userId.toString();
        const isSeller = transaction.seller && transaction.seller._id.toString() === userId.toString();
        
        let userRole = 'unknown';
        let direction = 'neutral';
        
        if (transaction.type === 'transfer') {
          if (isBuyer) {
            userRole = 'sender';
            direction = 'outgoing';
          } else if (isSeller) {
            userRole = 'recipient';
            direction = 'incoming';
          }
        } else if (transaction.type === 'deposit') {
          userRole = 'recipient';
          direction = 'incoming';
        } else if (transaction.type === 'withdrawal') {
          userRole = 'sender';
          direction = 'outgoing';
        } else {
          // auction, fixed-price, offer, trade
          if (isBuyer) {
            userRole = 'buyer';
            direction = 'outgoing';
          } else if (isSeller) {
            userRole = 'seller';
            direction = 'incoming';
          }
        }

        return {
          ...transaction,
          userRole,
          direction
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        transactions: transactionsWithRole,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user's balance summary (total earned, spent, etc.)
  async getUserBalanceSummary(userId) {
    try {
      const summary = await Transaction.aggregate([
        {
          $match: {
            $or: [
              { buyer: require('mongoose').Types.ObjectId(userId) },
              { seller: require('mongoose').Types.ObjectId(userId) }
            ],
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: {
                $cond: [
                  { $eq: ['$seller', require('mongoose').Types.ObjectId(userId)] },
                  '$amount',
                  0
                ]
              }
            },
            totalSpent: {
              $sum: {
                $cond: [
                  { $eq: ['$buyer', require('mongoose').Types.ObjectId(userId)] },
                  '$amount',
                  0
                ]
              }
            },
            totalTransactions: { $sum: 1 },
            auctionEarnings: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$seller', require('mongoose').Types.ObjectId(userId)] },
                      { $eq: ['$type', 'auction'] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            },
            fixedPriceEarnings: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$seller', require('mongoose').Types.ObjectId(userId)] },
                      { $eq: ['$type', 'fixed-price'] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            },
            offerEarnings: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$seller', require('mongoose').Types.ObjectId(userId)] },
                      { $eq: ['$type', 'offer'] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const user = await User.findById(userId).select('balance createdAt');
      if (!user) {
        throw new Error('User not found');
      }

      const summaryData = summary[0] || {
        totalEarned: 0,
        totalSpent: 0,
        totalTransactions: 0,
        auctionEarnings: 0,
        fixedPriceEarnings: 0,
        offerEarnings: 0
      };

      return {
        currentBalance: user.balance,
        totalEarned: summaryData.totalEarned,
        totalSpent: summaryData.totalSpent,
        netEarnings: summaryData.totalEarned - summaryData.totalSpent,
        totalTransactions: summaryData.totalTransactions,
        breakdown: {
          auctionEarnings: summaryData.auctionEarnings,
          fixedPriceEarnings: summaryData.fixedPriceEarnings,
          offerEarnings: summaryData.offerEarnings
        },
        memberSince: user.createdAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if user has sufficient balance for a transaction
  async checkSufficientBalance(userId, amount) {
    try {
      const user = await User.findById(userId).select('balance');
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        hasSufficientBalance: user.balance >= amount,
        currentBalance: user.balance,
        requiredAmount: amount,
        shortfall: Math.max(0, amount - user.balance)
      };
    } catch (error) {
      throw error;
    }
  }

  // Get recent balance changes
  async getRecentBalanceChanges(userId, limit = 10) {
    try {
      const transactions = await Transaction.find({
        $or: [
          { buyer: userId },
          { seller: userId }
        ],
        status: 'completed'
      })
      .sort({ completedAt: -1 })
      .limit(limit)
      .populate('buyer', 'username')
      .populate('seller', 'username')
      .populate('book', 'title')
      .lean();

      const changes = transactions.map(transaction => {
        const isBuyer = transaction.buyer && transaction.buyer._id.toString() === userId.toString();
        const isSeller = transaction.seller && transaction.seller._id.toString() === userId.toString();
        
        let change = 0;
        let description = '';
        
        if (isSeller) {
          change = transaction.amount;
          switch (transaction.type) {
            case 'auction':
              description = `Sold "${transaction.book?.title}" via auction`;
              break;
            case 'fixed-price':
              description = `Sold "${transaction.book?.title}" at fixed price`;
              break;
            case 'offer':
              description = `Sold "${transaction.book?.title}" via accepted offer`;
              break;
            case 'deposit':
              description = 'Funds added to account';
              break;
            case 'transfer':
              description = `Received transfer from ${transaction.buyer?.username}`;
              break;
            default:
              description = 'Funds received';
          }
        } else if (isBuyer) {
          change = -transaction.amount;
          switch (transaction.type) {
            case 'auction':
              description = `Won auction for "${transaction.book?.title}"`;
              break;
            case 'fixed-price':
              description = `Purchased "${transaction.book?.title}"`;
              break;
            case 'offer':
              description = `Purchased "${transaction.book?.title}" via offer`;
              break;
            case 'withdrawal':
              description = 'Funds withdrawn from account';
              break;
            case 'transfer':
              description = `Sent transfer to ${transaction.seller?.username}`;
              break;
            default:
              description = 'Funds spent';
          }
        }

        return {
          transactionId: transaction._id,
          change,
          description,
          timestamp: transaction.completedAt || transaction.createdAt,
          type: transaction.type
        };
      });

      return changes;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BalanceService;