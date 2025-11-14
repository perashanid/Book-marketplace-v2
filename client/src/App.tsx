import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookListPage from './pages/BookListPage';
import BookDetailPage from './pages/BookDetailPage';
import ProfilePage from './pages/ProfilePage';
import CreateBookPage from './pages/CreateBookPage';
import PDFLibraryPage from './pages/PDFLibraryPage';
import './styles/mobile-responsive.css';
import AuctionPage from './pages/AuctionPage';
import TradePage from './pages/TradePage';
import OffersPage from './pages/OffersPage';
import NotificationsPage from './pages/NotificationsPage';
import SearchPage from './pages/SearchPage';
import DashboardPage from './pages/DashboardPage';
import ContactPage from './pages/ContactPage';
import AIRecommendationsPage from './pages/AIRecommendationsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { GOOGLE_CLIENT_ID } from './config/env';

import './App.css';
import './components/common/BookCard.css';
import './styles/pages.css';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router>
          <div className="app">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/books" element={<BookListPage />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/auctions/:id" element={<AuctionPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/pdf-library" element={<PDFLibraryPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/create-book" 
                  element={
                    <ProtectedRoute>
                      <CreateBookPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/trades" 
                  element={
                    <ProtectedRoute>
                      <TradePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/offers" 
                  element={
                    <ProtectedRoute>
                      <OffersPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/notifications" 
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/ai-recommendations" 
                  element={
                    <ProtectedRoute>
                      <AIRecommendationsPage />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
          </div>
          </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
