// Export all middleware from this file
const { authenticateToken, checkResourceOwnership, optionalAuth } = require('./auth');

module.exports = {
  authenticateToken,
  checkResourceOwnership,
  optionalAuth
};