import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CreditCard } from 'lucide-react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-section footer-brand">
            <div className="footer-logo">
              <BookOpen className="logo-icon" size={32} />
              <h3>Bookverse</h3>
            </div>
            <p className="footer-tagline">
              Your trusted marketplace for buying, selling, and trading books.
              Join thousands of book lovers in our vibrant community.
            </p>
          </div>

          {/* Marketplace Section */}
          <div className="footer-section">
            <h4>Marketplace</h4>
            <ul>
              <li>
                <Link to="/books">Browse Books</Link>
              </li>
              <li>
                <Link to="/books?type=auction">Auctions</Link>
              </li>
              <li>
                <Link to="/books?type=fixed">Fixed Price</Link>
              </li>
              <li>
                <Link to="/trades">Book Trading</Link>
              </li>
              <li>
                <Link to="/pdf-library">PDF Library</Link>
              </li>
              <li>
                <Link to="/create-book">Sell a Book</Link>
              </li>
            </ul>
          </div>

          {/* Account Section */}
          <div className="footer-section">
            <h4>Account</h4>
            <ul>
              <li>
                <Link to="/profile">My Profile</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/offers">My Offers</Link>
              </li>
              <li>
                <Link to="/notifications">Notifications</Link>
              </li>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/register">Create Account</Link>
              </li>
            </ul>
          </div>

          {/* Support Section */}
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li>
                <Link to="/contact">Contact Us</Link>
              </li>
              <li>
                <a href="#faq">FAQ</a>
              </li>
              <li>
                <a href="#help">Help Center</a>
              </li>
              <li>
                <a href="#shipping">Shipping Info</a>
              </li>
              <li>
                <a href="#returns">Returns Policy</a>
              </li>
              <li>
                <a href="#safety">Safety Tips</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              <p>&copy; {currentYear} Bookverse. All rights reserved.</p>
            </div>
            <div className="footer-legal">
              <a href="#terms">Terms of Service</a>
              <span className="separator">•</span>
              <a href="#privacy">Privacy Policy</a>
              <span className="separator">•</span>
              <a href="#cookies">Cookie Policy</a>
            </div>
            <div className="footer-payment">
              <CreditCard size={24} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;