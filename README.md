# Bookverse

A MERN stack web application for buying, selling, auctioning, and trading books.

## Features

- **AI-Powered Recommendations**: Personalized book suggestions using Google Gemini
- **Interactive AI Chat**: Natural conversations about book preferences
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
- **Authentication**: JWT tokens, Google OAuth 2.0
- **AI**: Google Gemini Pro for book recommendations

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

This application is configured for **single-service deployment** on Render, where both frontend and backend run together.

### Quick Deploy to Render

1. **Push to GitHub**
2. **Create Web Service** on Render
3. **Configure**: 
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. **Add Environment Variables** (see below)
5. **Deploy!**

### 📚 Deployment Guides

- **Quick Start**: [RENDER_QUICK_START.md](RENDER_QUICK_START.md) - Deploy in 5 minutes
- **Step-by-Step**: [RENDER_STEP_BY_STEP.md](RENDER_STEP_BY_STEP.md) - Detailed visual guide
- **Full Guide**: [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) - Complete documentation
- **FAQ**: [DEPLOYMENT_FAQ.md](DEPLOYMENT_FAQ.md) - Common questions answered
- **Architecture**: [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) - How it works

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Set to `production` |
| `PORT` | ✅ | Set to `10000` (Render default) |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Random 32+ character string |
| `GOOGLE_CLIENT_ID` | ⚠️ | For Google Sign-In (optional) |
| `GEMINI_API_KEY` | ⚠️ | For AI features (optional) |

### Google OAuth Setup

To enable Google Sign-In:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - Your production domain
6. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - Your production domain
7. Copy the Client ID to:
   - `server/.env` as `GOOGLE_CLIENT_ID`
   - `client/src/config/env.ts` as `GOOGLE_CLIENT_ID`

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

### AI Recommendations
- `GET /api/ai/recommendations` - Get personalized book recommendations
- `POST /api/ai/chat` - Chat with AI about books
- `GET /api/ai/preferences` - Get user preferences
- `PUT /api/ai/preferences` - Update preferences
- `GET /api/ai/similar/:bookId` - Get similar books

## AI Features Setup

See [GEMINI_SETUP_GUIDE.md](GEMINI_SETUP_GUIDE.md) for detailed instructions on setting up AI recommendations.

**Quick Start:**
1. Get API key from https://makersuite.google.com/app/apikey
2. Add to `server/.env`: `GEMINI_API_KEY=your-key`
3. Restart server
4. Visit `/ai-recommendations` in your app

**Cost:** FREE for most use cases (60 requests/minute)

## License

MIT License