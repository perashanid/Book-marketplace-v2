# Book Marketplace

A MERN stack web application for buying, selling, auctioning, and trading books.

## Features

- Auction System: Time-limited bidding on books
- Fixed-Price Sales: Immediate purchase options
- Book Trading: Exchange books without money
- Offer System: Negotiate prices on fixed-price items
- PDF Sharing: Share downloadable digital books
- Real-time Updates: Live auction bidding and notifications

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite, React Router
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Update the MongoDB URI and JWT secret

### Running the Application

Start both frontend and backend:
```bash
npm run dev
```

Open your browser to `http://localhost:5173`

## Deployment

This application is configured for deployment on Render using the included `render.yaml` file.

### Render Deployment

1. Connect your repository to Render
2. The `render.yaml` file will automatically configure:
   - Backend API service
   - Frontend static site
   - MongoDB database

### Environment Variables

The following environment variables are required:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
- `NODE_ENV`: Environment (production/development)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Create book listing
- `GET /api/books/:id` - Get book details

### Auctions & Trading
- `POST /api/auctions/:bookId/bid` - Place bid
- `POST /api/trades` - Propose trade
- `POST /api/offers` - Make offer

## License

MIT License