const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get WebSocket server statistics (admin/debug endpoint)
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Socket service not available'
        }
      });
    }

    const stats = {
      connectedUsers: socketService.getConnectedUsersCount(),
      auctionRooms: socketService.getAuctionRoomsInfo(),
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Socket stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch socket statistics'
      }
    });
  }
});

// Check online status of specific users
router.post('/online-status', authenticateToken, (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'userIds must be an array'
        }
      });
    }

    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Socket service not available'
        }
      });
    }

    const onlineStatus = socketService.getUserOnlineStatus(userIds);

    res.json({
      success: true,
      data: {
        onlineStatus
      }
    });
  } catch (error) {
    console.error('Online status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to check online status'
      }
    });
  }
});

// Send system announcement (admin only - simplified for demo)
router.post('/announcement', authenticateToken, (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_MESSAGE',
          message: 'Announcement message is required'
        }
      });
    }

    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Socket service not available'
        }
      });
    }

    socketService.sendAnnouncement(message, type);

    res.json({
      success: true,
      message: 'Announcement sent successfully'
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANNOUNCEMENT_ERROR',
        message: 'Failed to send announcement'
      }
    });
  }
});

// Get auction room participant count
router.get('/auction/:bookId/participants', (req, res) => {
  try {
    const { bookId } = req.params;
    const socketService = req.app.get('socketService');
    
    if (!socketService) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Socket service not available'
        }
      });
    }

    const participantCount = socketService.getAuctionParticipantCount(bookId);

    res.json({
      success: true,
      data: {
        bookId,
        participantCount
      }
    });
  } catch (error) {
    console.error('Auction participants error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PARTICIPANTS_ERROR',
        message: 'Failed to get auction participants'
      }
    });
  }
});

module.exports = router;