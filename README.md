# Book Marketplace

A MERN stack web application for buying, selling, auctioning, and trading books.

## Features

- **Auction System**: Time-limited bidding on books
- **Fixed-Price Sales**: Immediate purchase options
- **Book Trading**: Exchange books without money
- **Offer System**: Negotiate prices on fixed-price items
- **PDF Sharing**: Share downloadable digital books
- **Real-time Updates**: Live auction bidding and notifications

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite, React Router
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Install root dependencies:
   ```bash
   npm install
   ```

3. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

4. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

5. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Update the MongoDB URI and JWT secret

### Running the Application

1. Start both frontend and backend:
   ```bash
   npm run dev
   ```

   Or run them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

2. Open your browser to `http://localhost:5173`

## Project Structure

```
book-marketplace/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── context/       # React context
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Express backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── package.json
└── package.json          # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Create book listing
- `GET /api/books/:id` - Get book details
- `PUT /api/books/:id` - Update book listing

### Auctions
- `POST /api/auctions/:bookId/bid` - Place bid
- `GET /api/auctions/:bookId/bids` - Get bid history

### Trades & Offers
- `POST /api/trades` - Propose trade
- `POST /api/offers` - Make offer
- `PUT /api/trades/:id/accept` - Accept trade
- `PUT /api/offers/:id/accept` - Accept offer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License