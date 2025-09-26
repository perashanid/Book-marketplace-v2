const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const bookRoutes = require('./books');

// Use routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);

module.exports = router;