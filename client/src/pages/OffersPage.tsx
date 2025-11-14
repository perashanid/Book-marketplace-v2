import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './OffersPage.css';

interface Book {
  _id: string;
  title: string;
  author: string;
  condition: string;
  images: string[];
  fixedPrice: number;
}

interface Offer {
  _id: string;
  book: Book;
  buyer: {
    _id: string;
    username: string;
  };
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

const OffersPage: React.FC = () => {
  const { } = useAuth();
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSentOffers(data.sent || []);
        setReceivedOffers(data.received || []);
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferResponse = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch(`/api/offers/${offerId}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchOffers();
      }
    } catch (error) {
      console.error(`Failed to ${action} offer:`, error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading offers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Offers</h1>
        <div className="tabs-container">
          <button 
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent Offers ({sentOffers.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received Offers ({receivedOffers.length})
          </button>
        </div>
      </div>

      {activeTab === 'sent' && (
          <div>
            {sentOffers.length === 0 ? (
              <div className="empty-state">
                <h3>No offers sent</h3>
                <p>You haven't made any offers yet.</p>
              </div>
            ) : (
              <div className="list-container">
                {sentOffers.map(offer => (
                  <div key={offer._id} className="list-item">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {offer.book.images?.[0] && (
                        <img 
                          src={offer.book.images[0]} 
                          alt={offer.book.title}
                          style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>{offer.book.title}</h3>
                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>by {offer.book.author}</p>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                          Listed at: <strong>${offer.book.fixedPrice}</strong> | 
                          Your offer: <strong style={{ color: 'var(--primary-color)' }}>${offer.amount}</strong>
                        </p>
                        {offer.message && (
                          <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            "{offer.message}"
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${offer.status}`} style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '20px', 
                          fontSize: '0.8rem',
                          backgroundColor: offer.status === 'pending' ? 'var(--warning-color)' : 
                                         offer.status === 'accepted' ? 'var(--success-color)' : 'var(--error-color)',
                          color: 'white'
                        }}>
                          {offer.status}
                        </span>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          {new Date(offer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'received' && (
          <div>
            {receivedOffers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>You haven't received any offers yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {receivedOffers.map(offer => (
                  <div key={offer._id} className="card">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {offer.book.images?.[0] && (
                        <img 
                          src={offer.book.images[0]} 
                          alt={offer.book.title}
                          style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>{offer.book.title}</h3>
                        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>by {offer.book.author}</p>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                          From: <strong>{offer.buyer.username}</strong> | 
                          Offer: <strong style={{ color: 'var(--primary-color)' }}>${offer.amount}</strong>
                        </p>
                        {offer.message && (
                          <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            "{offer.message}"
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${offer.status}`} style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '20px', 
                          fontSize: '0.8rem',
                          backgroundColor: offer.status === 'pending' ? 'var(--warning-color)' : 
                                         offer.status === 'accepted' ? 'var(--success-color)' : 'var(--error-color)',
                          color: 'white'
                        }}>
                          {offer.status}
                        </span>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          {new Date(offer.createdAt).toLocaleDateString()}
                        </p>
                        
                        {offer.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button 
                              className="btn btn-success btn-small"
                              onClick={() => handleOfferResponse(offer._id, 'accept')}
                            >
                              Accept
                            </button>
                            <button 
                              className="btn btn-error btn-small"
                              onClick={() => handleOfferResponse(offer._id, 'reject')}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default OffersPage;