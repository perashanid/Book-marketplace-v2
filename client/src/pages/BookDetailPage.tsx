import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Flame, DollarSign, RefreshCw, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  condition: string;
  category: string;
  images: string[];
  pdfLink?: string;
  listingTypes: {
    fixedPrice: boolean;
    auction: boolean;
    tradeOnly: boolean;
  };
  // Legacy field for backward compatibility
  listingType?: 'auction' | 'fixed-price' | 'trade-only';
  fixedPrice?: number;
  currentBid?: number;
  startingBid?: number;
  auctionEndTime?: string;
  isAuctionActive?: boolean;
  acceptsOffers?: boolean;
  seller: {
    _id: string;
    username: string;
    createdAt: string;
  };
  createdAt: string;
}

interface Bid {
  _id: string;
  amount: number;
  bidder: {
    _id: string;
    username: string;
  };
  timestamp: string;
}

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinAuctionRoom, leaveAuctionRoom } = useSocket();
  
  const [book, setBook] = useState<Book | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [userBooks, setUserBooks] = useState<Book[]>([]);
  const [selectedTradeBooks, setSelectedTradeBooks] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchBookDetails();
    }
  }, [id]);

  useEffect(() => {
    if (book?.listingTypes?.auction && book.isAuctionActive) {
      joinAuctionRoom(book._id);
      fetchBidHistory();
      
      // Set up real-time listeners
      if (socket) {
        socket.on('bid_update', handleBidUpdate);
        socket.on('auction_ended', handleAuctionEnded);
      }

      return () => {
        leaveAuctionRoom(book._id);
        if (socket) {
          socket.off('bid_update', handleBidUpdate);
          socket.off('auction_ended', handleAuctionEnded);
        }
      };
    }
  }, [book, socket]);

  useEffect(() => {
    if (user && showTradeModal) {
      fetchUserBooks();
    }
  }, [user, showTradeModal]);

  useEffect(() => {
    if (book?.auctionEndTime) {
      const timer = setInterval(() => {
        const remaining = getTimeRemaining(book.auctionEndTime!);
        setTimeRemaining(remaining);
        
        if (remaining === 'Ended') {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [book?.auctionEndTime]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/books/${id}`);
      
      if (response.data.success) {
        setBook(response.data.data.book);
        setIsOwner(response.data.data.isOwner);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch book details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBidHistory = async () => {
    try {
      const response = await api.get(`/api/auctions/${id}/bids`);
      if (response.data.success) {
        setBidHistory(response.data.data.bids);
      }
    } catch (err) {
      console.error('Failed to fetch bid history:', err);
    }
  };

  const handleBidUpdate = (data: any) => {
    if (data.bookId === book?._id) {
      setBook(prev => prev ? { ...prev, currentBid: data.currentBid } : null);
      setBidHistory(prev => [data.newBid, ...prev.slice(0, 9)]);
    }
  };

  const handleAuctionEnded = (data: any) => {
    if (data.bookId === book?._id) {
      setBook(prev => prev ? { ...prev, isAuctionActive: false } : null);
    }
  };

  const placeBid = async () => {
    if (!user || !book || !bidAmount) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/api/auctions/${book._id}/bid`, {
        amount: parseFloat(bidAmount)
      });

      if (response.data.success) {
        setBidAmount('');
        // Real-time update will handle the UI update
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to place bid');
    } finally {
      setSubmitting(false);
    }
  };

  const makeOffer = async () => {
    if (!user || !book || !offerAmount) return;

    try {
      setSubmitting(true);
      const response = await api.post('/api/offers', {
        bookId: book._id,
        amount: parseFloat(offerAmount),
        message: offerMessage
      });

      if (response.data.success) {
        alert('Offer submitted successfully! The seller will be notified.');
        setOfferAmount('');
        setOfferMessage('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to make offer');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchUserBooks = async () => {
    try {
      const response = await api.get('/api/books/my-books');
      if (response.data.success) {
        // Filter out the current book and only show available books
        const availableBooks = response.data.data.books.filter(
          (userBook: Book) => userBook._id !== book?._id && userBook.listingTypes?.tradeOnly
        );
        setUserBooks(availableBooks);
      }
    } catch (err) {
      console.error('Failed to fetch user books:', err);
    }
  };

  const proposeTrade = async () => {
    if (!user || !book || selectedTradeBooks.length === 0) return;

    try {
      setSubmitting(true);
      const response = await api.post('/api/trades', {
        recipientBookId: book._id,
        proposerBookIds: selectedTradeBooks,
        message: tradeMessage
      });

      if (response.data.success) {
        alert('Trade proposal submitted successfully! The seller will be notified.');
        setShowTradeModal(false);
        setSelectedTradeBooks([]);
        setTradeMessage('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to propose trade');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTradeBook = (bookId: string) => {
    setSelectedTradeBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const buyNow = async () => {
    if (!user || !book) return;

    if (window.confirm(`Are you sure you want to buy "${book.title}" for ${formatPrice(book.fixedPrice || 0)}?`)) {
      try {
        setSubmitting(true);
        const response = await api.post('/api/purchases/buy-now', {
          bookId: book._id
        });

        if (response.data.success) {
          alert('Purchase successful!');
          navigate('/profile');
        }
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to purchase book');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = end - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading book details...</div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'red' }}>{error || 'Book not found'}</div>
        <button onClick={() => navigate('/books')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Back to Books
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Book Images */}
        <div>
          {book.images.length > 0 ? (
            <img
              src={book.images[0]}
              alt={book.title}
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '400px', 
              backgroundColor: '#f5f5f5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '8px'
            }}>
              No Image Available
            </div>
          )}
        </div>

        {/* Book Details */}
        <div>
          <h1 style={{ margin: '0 0 1rem 0' }}>{book.title}</h1>
          <p style={{ fontSize: '1.2rem', color: '#666', margin: '0 0 1rem 0' }}>by {book.author}</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Condition:</strong> {book.condition}</p>
            <p><strong>Category:</strong> {book.category}</p>
            <p><strong>Seller:</strong> {book.seller.username}</p>
            <p><strong>Listed:</strong> {new Date(book.createdAt).toLocaleDateString()}</p>
          </div>

          {book.description && (
            <div style={{ marginBottom: '1rem' }}>
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          )}

          {book.pdfLink && (
            <div style={{ marginBottom: '1rem' }}>
              <a 
                href={book.pdfLink} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'none' }}
              >
                <FileText size={16} /> View PDF
              </a>
            </div>
          )}

          {/* Multiple Listing Types Support */}
          <div className="listing-types-container">
            {/* Auction Section */}
            {book.listingTypes?.auction && (
              <div className="listing-section auction-section">
                <h3 className="listing-title"><Flame size={20} /> Auction</h3>
                <p><strong>Current Bid:</strong> {formatPrice(book.currentBid || book.startingBid || 0)}</p>
                <p><strong>Starting Bid:</strong> {formatPrice(book.startingBid || 0)}</p>
                
                {book.isAuctionActive ? (
                  <p><strong>Time Remaining:</strong> <span className="time-remaining">{timeRemaining}</span></p>
                ) : (
                  <p className="auction-ended">Auction has ended</p>
                )}

                {user && !isOwner && book.isAuctionActive && timeRemaining !== 'Ended' && (
                  <div className="bid-section">
                    <input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={(book.currentBid || book.startingBid || 0) + 0.01}
                      step="0.01"
                      className="form-input bid-input"
                    />
                    <button
                      onClick={placeBid}
                      disabled={submitting || !bidAmount || parseFloat(bidAmount) <= (book.currentBid || book.startingBid || 0)}
                      className="btn btn-primary"
                    >
                      {submitting ? 'Placing Bid...' : 'Place Bid'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fixed Price Section */}
            {book.listingTypes?.fixedPrice && (
              <div className="listing-section fixed-price-section">
                <h3 className="listing-title"><DollarSign size={20} /> Fixed Price</h3>
                <p className="price-display">{formatPrice(book.fixedPrice || 0)}</p>

                {user && !isOwner && (
                  <div className="purchase-section">
                    <button
                      onClick={buyNow}
                      disabled={submitting}
                      className="btn btn-success btn-large"
                    >
                      {submitting ? 'Processing...' : 'Buy Now'}
                    </button>

                    {book.acceptsOffers && (
                      <div className="offer-section">
                        <h4>Make an Offer</h4>
                        <div className="offer-inputs">
                          <input
                            type="number"
                            placeholder="Offer amount"
                            value={offerAmount}
                            onChange={(e) => setOfferAmount(e.target.value)}
                            step="0.01"
                            className="form-input offer-amount"
                          />
                          <input
                            type="text"
                            placeholder="Optional message"
                            value={offerMessage}
                            onChange={(e) => setOfferMessage(e.target.value)}
                            className="form-input offer-message"
                          />
                          <button
                            onClick={makeOffer}
                            disabled={submitting || !offerAmount}
                            className="btn btn-primary"
                          >
                            {submitting ? 'Submitting...' : 'Make Offer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trade Only Section */}
            {book.listingTypes?.tradeOnly && (
              <div className="listing-section trade-section">
                <h3 className="listing-title"><RefreshCw size={20} /> Trade Only</h3>
                <p>This book is available for trade only. Propose a trade with your own books.</p>
                
                {user && !isOwner && (
                  <button
                    onClick={() => setShowTradeModal(true)}
                    className="btn btn-info btn-large"
                  >
                    Propose Trade
                  </button>
                )}
              </div>
            )}
          </div>

          {!user && (
            <div style={{ padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
              <p>Please <a href="/login">login</a> to interact with this listing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bid History for Auctions */}
      {book.listingTypes?.auction && bidHistory.length > 0 && (
        <div className="bid-history-section">
          <h3>Bid History</h3>
          <div className="bid-history-container">
            {bidHistory.map((bid, index) => (
              <div key={bid._id} className={`bid-item ${index === 0 ? 'latest-bid' : ''}`}>
                <div className="bid-details">
                  <div>
                    <strong>{formatPrice(bid.amount)}</strong>
                    <span className="bidder-name">by {bid.bidder.username}</span>
                  </div>
                  <div className="bid-timestamp">
                    {new Date(bid.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade Proposal Modal */}
      {showTradeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Propose Trade</h2>
              <button onClick={() => setShowTradeModal(false)} className="modal-close"><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <p>Select books from your collection to trade for "{book.title}":</p>
              
              {userBooks.length === 0 ? (
                <div className="no-books-message">
                  <p>You don't have any books available for trading.</p>
                  <p>Make sure your books are listed as "Trade Only" to use them in trades.</p>
                </div>
              ) : (
                <div className="trade-books-grid">
                  {userBooks.map((userBook) => (
                    <div 
                      key={userBook._id} 
                      className={`trade-book-item ${selectedTradeBooks.includes(userBook._id) ? 'selected' : ''}`}
                      onClick={() => toggleTradeBook(userBook._id)}
                    >
                      <img 
                        src={userBook.images[0] || '/default-book-cover.jpg'} 
                        alt={userBook.title}
                        className="trade-book-image"
                      />
                      <div className="trade-book-info">
                        <h4>{userBook.title}</h4>
                        <p>by {userBook.author}</p>
                        <p className="book-condition">{userBook.condition}</p>
                      </div>
                      <div className="selection-indicator">
                        {selectedTradeBooks.includes(userBook._id) ? <Check size={16} /> : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {userBooks.length > 0 && (
                <div className="trade-message-section">
                  <label className="form-label">Message (Optional)</label>
                  <textarea
                    className="form-input"
                    value={tradeMessage}
                    onChange={(e) => setTradeMessage(e.target.value)}
                    placeholder="Add a message to your trade proposal..."
                    rows={3}
                  />
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowTradeModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={proposeTrade}
                disabled={submitting || selectedTradeBooks.length === 0}
                className="btn btn-primary"
              >
                {submitting ? 'Proposing...' : `Propose Trade (${selectedTradeBooks.length} books)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;