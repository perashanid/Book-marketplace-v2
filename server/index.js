const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Set environment variables if not loaded from .env
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'book-marketplace-super-secret-jwt-key-2024';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || true
      : ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const auctionRoutes = require('./routes/auctions');
const purchaseRoutes = require('./routes/purchases');
const offerRoutes = require('./routes/offers');
const tradeRoutes = require('./routes/trades');
const balanceRoutes = require('./routes/balance');
const socketRoutes = require('./routes/socket');
const aiRoutes = require('./routes/ai');

// Import services
const SocketService = require('./services/socketService');
const AuctionService = require('./services/auctionService');
const PurchaseService = require('./services/purchaseService');
const TradeService = require('./services/tradeService');
const BalanceService = require('./services/balanceService');

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Bookverse API is running!' });
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    res.json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Initialize services (order matters - SocketService first)
const socketService = new SocketService(io);
const auctionService = new AuctionService(io);
const purchaseService = new PurchaseService(io);
const tradeService = new TradeService(io);
const balanceService = new BalanceService(io);

app.set('socketService', socketService);
app.set('auctionService', auctionService);
app.set('purchaseService', purchaseService);
app.set('tradeService', tradeService);
app.set('balanceService', balanceService);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/socket', socketRoutes);
app.use('/api/ai', aiRoutes);

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('MONGODB_URI exists:', !!MONGODB_URI);

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Connection string format check:');
    console.error('- Should start with: mongodb+srv://');
    console.error('- Should contain cluster name like: cluster0.xxxxx.mongodb.net');
    console.error('- Should end with database name');
    process.exit(1);
  });

// Socket.io connection handling is now managed by SocketService
// The SocketService handles all WebSocket events and room management

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };