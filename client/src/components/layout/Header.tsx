import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sun,
  Moon,
  Search,
  FileText,
  Plus,
  BarChart3,
  Bell,
  User,
  Wallet,
  LogOut,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };



  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src="/book-logo.svg" alt="Book Marketplace" className="logo-image" />
          <h1>BookMarket</h1>
        </Link>

        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <div className="nav-section">
            <Link to="/books" className="nav-link" onClick={closeMenu}>
              <Search size={16} />
              Browse Books
            </Link>
            <Link to="/pdf-library" className="nav-link" onClick={closeMenu}>
              <FileText size={16} />
              Free PDFs
            </Link>
            <Link to="/contact" className="nav-link" onClick={closeMenu}>
              <MessageCircle size={16} />
              Contact
            </Link>
            {user && (
              <>
                <Link to="/ai-recommendations" className="nav-link ai-link" onClick={closeMenu}>
                  <Sparkles size={16} />
                  AI Recommendations
                </Link>
                <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
                  <BarChart3 size={16} />
                  Dashboard
                </Link>
              </>
            )}
          </div>

          <div className="nav-actions">
            {user ? (
              <div className="user-menu">
                <Link to="/notifications" className="nav-link" onClick={closeMenu}>
                  <Bell size={16} />
                  Notifications
                </Link>
                <Link to="/create-book" className="btn btn-primary btn-small" onClick={closeMenu}>
                  <Plus size={16} />
                  Sell Book
                </Link>
                <div className="balance">
                  <Wallet size={16} />
                  {formatBalance(user.balance)}
                </div>
                <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
                  <span className="theme-toggle-text">{isDarkMode ? 'Light' : 'Dark'}</span>
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <Link to="/profile" className="nav-link" onClick={closeMenu}>
                  <User size={16} />
                  {user.username}
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary btn-small">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-links">
                <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
                  <span className="theme-toggle-text">{isDarkMode ? 'Light' : 'Dark'}</span>
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <Link to="/login" className="nav-link" onClick={closeMenu}>Login</Link>
                <Link to="/register" className="btn btn-primary btn-small" onClick={closeMenu}>Register</Link>
              </div>
            )}
          </div>
        </nav>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Header;