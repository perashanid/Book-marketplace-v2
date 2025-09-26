import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  condition: string;
  images: string[];
  currentBid: number;
  startingBid: number;
  auctionEndTime: string;
  isAuctionActive: boolean;
  seller: {
    _id: string;
    username: string;
  };
}

const AuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [book, setBook] = useState<Book | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const fetchBookDetails = async () => {
    try {
      const response = await fetch(`/api/books/${id}`);
      if (response.ok) {
        const bookData = await response.json();
        setBook(bookData);
      } else {
        setError('Book not found');
      }
    } catch (err) {
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (!amount || amount <= (book?.currentBid || book?.startingBid || 0)) {
      setError('Bid must be higher than current bid');
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        setBidAmount('');
        fetchBookDetails();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to place bid');
      }
    } catch (err) {
      setError('Failed to place bid');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading auction details...</span>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page-container">
        <div className="error-message">Book not found</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">{book.title}</h1>
          <p className="card-subtitle">by {book.author}</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            {book.images?.[0] && (
              <img 
                src={book.images[0]} 
                alt={book.title}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            )}
            <p style={{ marginTop: '1rem' }}>{book.description}</p>
          </div>
          
          <div>
            <div className="card">
              <h3>Live Auction</h3>
              <p><strong>Current Bid:</strong> ${book.currentBid || book.startingBid}</p>
              <p><strong>Seller:</strong> {book.seller.username}</p>
              
              {book.isAuctionActive && user && user._id !== book.seller._id && (
                <form onSubmit={handlePlaceBid} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min bid: $${(book.currentBid || book.startingBid) + 1}`}
                      className="form-input"
                      min={(book.currentBid || book.startingBid) + 1}
                      step="0.01"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Place Bid
                  </button>
                  {error && <div className="error-message" style={{ marginTop: '0.5rem' }}>{error}</div>}
                </form>
              )}
              
              {!book.isAuctionActive && (
                <div className="warning-message">Auction has ended</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;