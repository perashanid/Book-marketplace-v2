import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>BookMarket</h3>
            <p>Your trusted marketplace for buying, selling, and trading books.</p>
          </div>
          
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>Auction Books</li>
              <li>Fixed Price Sales</li>
              <li>Book Trading</li>
              <li>PDF Sharing</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 BookMarket. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;