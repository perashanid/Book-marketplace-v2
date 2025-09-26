const jwt = require('jsonwebtoken');
const { User } = require('../models');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userSockets = new Map(); // socketId -> userId mapping
    this.auctionRooms = new Map(); // bookId -> Set of socketIds
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.use(async (socket, next) => {
      try {
        // Optional authentication for WebSocket
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.userId).select('-password');
          
          if (user) {
            socket.userId = user._id.toString();
            socket.user = user;
          }
        }
        
        next();
      } catch (error) {
        // Allow connection even without valid token for public features
        next();
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}${socket.userId ? ` (User: ${socket.userId})` : ' (Anonymous)'}`);
      
      // Track authenticated users
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        this.userSockets.set(socket.id, socket.userId);
        
        // Join user's personal room for notifications
        socket.join(`user_${socket.userId}`);
        
        // Emit connection confirmation
        socket.emit('authenticated', {
          userId: socket.userId,
          username: socket.user.username
        });
      }

      // Auction room management
      socket.on('join_auction', (bookId) => {
        if (!bookId) return;
        
        const roomName = `auction_${bookId}`;
        socket.join(roomName);
        
        // Track auction room participants
        if (!this.auctionRooms.has(bookId)) {
          this.auctionRooms.set(bookId, new Set());
        }
        this.auctionRooms.get(bookId).add(socket.id);
        
        console.log(`Socket ${socket.id} joined auction room: ${roomName}`);
        
        // Notify others in the room about new participant (optional)
        socket.to(roomName).emit('user_joined_auction', {
          participantCount: this.auctionRooms.get(bookId).size
        });
      });

      socket.on('leave_auction', (bookId) => {
        if (!bookId) return;
        
        const roomName = `auction_${bookId}`;
        socket.leave(roomName);
        
        // Remove from auction room tracking
        if (this.auctionRooms.has(bookId)) {
          this.auctionRooms.get(bookId).delete(socket.id);
          if (this.auctionRooms.get(bookId).size === 0) {
            this.auctionRooms.delete(bookId);
          }
        }
        
        console.log(`Socket ${socket.id} left auction room: ${roomName}`);
      });

      // Real-time bid placement (alternative to HTTP API)
      socket.on('place_bid', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('bid_error', { message: 'Authentication required for bidding' });
            return;
          }

          const { bookId, amount } = data;
          
          if (!bookId || !amount || amount <= 0) {
            socket.emit('bid_error', { message: 'Invalid bid data' });
            return;
          }

          // Get auction service from the app
          const auctionService = socket.request?.app?.get('auctionService');
          if (!auctionService) {
            socket.emit('bid_error', { message: 'Auction service not available' });
            return;
          }

          // Place bid through service
          const bid = await auctionService.placeBid(bookId, socket.userId, amount);
          
          // Emit success to bidder
          socket.emit('bid_placed', {
            bidId: bid._id,
            bookId,
            amount,
            timestamp: bid.timestamp
          });

        } catch (error) {
          socket.emit('bid_error', { 
            message: error.message,
            bookId: data.bookId 
          });
        }
      });

      // Typing indicators for chat/messages (future feature)
      socket.on('typing_start', (data) => {
        if (socket.userId && data.roomId) {
          socket.to(data.roomId).emit('user_typing', {
            userId: socket.userId,
            username: socket.user?.username
          });
        }
      });

      socket.on('typing_stop', (data) => {
        if (socket.userId && data.roomId) {
          socket.to(data.roomId).emit('user_stopped_typing', {
            userId: socket.userId
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
        
        // Clean up user tracking
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.userSockets.delete(socket.id);
        }
        
        // Clean up auction room tracking
        for (const [bookId, socketSet] of this.auctionRooms.entries()) {
          if (socketSet.has(socket.id)) {
            socketSet.delete(socket.id);
            if (socketSet.size === 0) {
              this.auctionRooms.delete(bookId);
            } else {
              // Notify remaining participants
              this.io.to(`auction_${bookId}`).emit('user_left_auction', {
                participantCount: socketSet.size
              });
            }
          }
        }
      });
    });
  }

  // Utility methods for services to use

  // Send notification to a specific user
  notifyUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send notification to all users in an auction
  notifyAuctionRoom(bookId, event, data) {
    this.io.to(`auction_${bookId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send notification to multiple users
  notifyUsers(userIds, event, data) {
    userIds.forEach(userId => {
      this.notifyUser(userId, event, data);
    });
  }

  // Get online status of users
  getUserOnlineStatus(userIds) {
    const status = {};
    userIds.forEach(userId => {
      status[userId] = this.connectedUsers.has(userId.toString());
    });
    return status;
  }

  // Get auction room participant count
  getAuctionParticipantCount(bookId) {
    return this.auctionRooms.get(bookId)?.size || 0;
  }

  // Get all connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get auction rooms info
  getAuctionRoomsInfo() {
    const rooms = {};
    for (const [bookId, socketSet] of this.auctionRooms.entries()) {
      rooms[bookId] = {
        participantCount: socketSet.size,
        participants: Array.from(socketSet)
      };
    }
    return rooms;
  }

  // Send system-wide announcement
  sendAnnouncement(message, type = 'info') {
    this.broadcast('system_announcement', {
      message,
      type,
      timestamp: new Date()
    });
  }

  // Send maintenance notification
  sendMaintenanceNotification(message, scheduledTime) {
    this.broadcast('maintenance_notification', {
      message,
      scheduledTime,
      timestamp: new Date()
    });
  }

  // Auction-specific notifications
  notifyBidUpdate(bookId, bidData) {
    this.notifyAuctionRoom(bookId, 'bid_update', bidData);
  }

  notifyAuctionEnded(bookId, auctionData) {
    this.notifyAuctionRoom(bookId, 'auction_ended', auctionData);
  }

  notifyOutbid(userId, auctionData) {
    this.notifyUser(userId, 'outbid_notification', auctionData);
  }

  // Trade notifications
  notifyTradeProposal(userId, tradeData) {
    this.notifyUser(userId, 'trade_proposal_received', tradeData);
  }

  notifyTradeAccepted(userId, tradeData) {
    this.notifyUser(userId, 'trade_accepted', tradeData);
  }

  notifyTradeRejected(userId, tradeData) {
    this.notifyUser(userId, 'trade_rejected', tradeData);
  }

  // Offer notifications
  notifyOfferReceived(userId, offerData) {
    this.notifyUser(userId, 'offer_received', offerData);
  }

  notifyOfferAccepted(userId, offerData) {
    this.notifyUser(userId, 'offer_accepted', offerData);
  }

  notifyOfferRejected(userId, offerData) {
    this.notifyUser(userId, 'offer_rejected', offerData);
  }

  notifyCounterOffer(userId, offerData) {
    this.notifyUser(userId, 'counter_offer_received', offerData);
  }

  // Balance notifications
  notifyBalanceUpdate(userId, balanceData) {
    this.notifyUser(userId, 'balance_updated', balanceData);
  }

  // Book notifications
  notifyBookSold(userId, bookData) {
    this.notifyUser(userId, 'book_sold', bookData);
  }

  notifyBookPurchased(userId, bookData) {
    this.notifyUser(userId, 'book_purchased', bookData);
  }
}

module.exports = SocketService;