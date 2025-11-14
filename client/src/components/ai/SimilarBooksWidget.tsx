import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, ExternalLink } from 'lucide-react';
import './SimilarBooksWidget.css';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:5000');

interface SimilarBook {
  title: string;
  author: string;
  genre: string;
  reason: string;
  availableInMarketplace: boolean;
  marketplaceBooks: Array<{
    id: string;
    title: string;
    author: string;
    condition: string;
    fixedPrice?: number;
    currentBid?: number;
  }>;
}

interface Props {
  bookId: string;
}

const SimilarBooksWidget: React.FC<Props> = ({ bookId }) => {
  const [similarBooks, setSimilarBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSimilarBooks();
  }, [bookId]);

  const loadSimilarBooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/ai/similar/${bookId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSimilarBooks(response.data.recommendations);
    } catch (err: any) {
      console.error('Failed to load similar books:', err);
      setError(err.response?.data?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="similar-books-widget">
        <div className="widget-header">
          <Sparkles size={20} />
          <h3>AI-Powered Similar Books</h3>
        </div>
        <div className="loading-state">Loading recommendations...</div>
      </div>
    );
  }

  if (error || similarBooks.length === 0) {
    return null;
  }

  return (
    <div className="similar-books-widget">
      <div className="widget-header">
        <Sparkles size={20} />
        <h3>You Might Also Like</h3>
      </div>

      <div className="similar-books-list">
        {similarBooks.slice(0, 3).map((book, index) => (
          <div key={index} className="similar-book-card">
            <div className="book-header">
              <div>
                <h4>{book.title}</h4>
                <p className="book-author">by {book.author}</p>
              </div>
              {book.availableInMarketplace && (
                <span className="available-badge">Available</span>
              )}
            </div>
            
            <p className="book-genre">{book.genre}</p>
            {book.reason && <p className="book-reason">{book.reason}</p>}

            {book.availableInMarketplace && book.marketplaceBooks.length > 0 && (
              <div className="marketplace-link">
                <Link to={`/books/${book.marketplaceBooks[0].id}`} className="view-link">
                  <ExternalLink size={14} />
                  View in Marketplace
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      <Link to="/ai-recommendations" className="view-all-link">
        <Sparkles size={16} />
        Get More AI Recommendations
      </Link>
    </div>
  );
};

export default SimilarBooksWidget;
