import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Book {
  _id: string;
  title: string;
  author: string;
  condition: string;
  images: string[];
}

interface Trade {
  _id: string;
  proposer: {
    _id: string;
    username: string;
  };
  recipient: {
    _id: string;
    username: string;
  };
  proposerBooks: Book[];
  recipientBooks: Book[];
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message: string;
  createdAt: string;
}

const TradePage: React.FC = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTradeResponse = async (tradeId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/trades/${tradeId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchTrades();
      }
    } catch (error) {
      console.error(`Failed to ${action} trade:`, error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading trades...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Book Trades</h1>
        <p className="page-subtitle">Manage your book trading proposals</p>
      </div>

      {trades.length === 0 ? (
          <div className="empty-state">
            <h3>No trades yet</h3>
            <p>Start by proposing a trade!</p>
          </div>
        ) : (
          <div className="list-container">
            {trades.map(trade => (
              <div key={trade._id} className="list-item">
                <div className="list-item-header">
                  <div>
                    <strong>{trade.proposer.username}</strong> ⇄ <strong>{trade.recipient.username}</strong>
                  </div>
                  <span className={`status-badge ${trade.status}`}>
                    {trade.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <h4>{trade.proposer.username}'s Books</h4>
                    {trade.proposerBooks.map(book => (
                      <div key={book._id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {book.images?.[0] && (
                          <img src={book.images[0]} alt={book.title} style={{ width: '40px', height: '50px', objectFit: 'cover' }} />
                        )}
                        <div>
                          <p style={{ fontWeight: '600', margin: 0 }}>{book.title}</p>
                          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>{book.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4>{trade.recipient.username}'s Books</h4>
                    {trade.recipientBooks.map(book => (
                      <div key={book._id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {book.images?.[0] && (
                          <img src={book.images[0]} alt={book.title} style={{ width: '40px', height: '50px', objectFit: 'cover' }} />
                        )}
                        <div>
                          <p style={{ fontWeight: '600', margin: 0 }}>{book.title}</p>
                          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>{book.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {trade.message && (
                  <div className="card" style={{ marginTop: '1rem' }}>
                    <p style={{ fontStyle: 'italic', margin: 0 }}>"{trade.message}"</p>
                  </div>
                )}

                {trade.status === 'pending' && user?._id === trade.recipient._id && (
                  <div className="list-item-actions" style={{ marginTop: '1rem' }}>
                    <button 
                      className="btn btn-success"
                      onClick={() => handleTradeResponse(trade._id, 'accept')}
                    >
                      Accept Trade
                    </button>
                    <button 
                      className="btn btn-error"
                      onClick={() => handleTradeResponse(trade._id, 'reject')}
                    >
                      Reject Trade
                    </button>
                  </div>
                )}

                <div className="list-item-meta" style={{ marginTop: '1rem' }}>
                  Proposed on {new Date(trade.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default TradePage;