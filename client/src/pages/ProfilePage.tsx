import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface Book {
  _id: string;
  title: string;
  author: string;
  condition: string;
  listingType: 'auction' | 'fixed-price' | 'trade-only';
  fixedPrice?: number;
  currentBid?: number;
  startingBid?: number;
  auctionEndTime?: string;
  isAuctionActive?: boolean;
  createdAt: string;
}

interface Transaction {
  _id: string;
  type: 'auction' | 'fixed-price' | 'offer' | 'trade';
  amount?: number;
  status: string;
  book?: {
    _id: string;
    title: string;
    author: string;
  };
  buyer?: {
    _id: string;
    username: string;
  };
  seller?: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

interface Offer {
  _id: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  book: {
    _id: string;
    title: string;
    author: string;
  };
  buyer: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'transactions' | 'offers'>('overview');
  const [userBooks, setUserBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });

  useEffect(() => {
    if (activeTab === 'books') {
      fetchUserBooks();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'offers') {
      fetchOffers();
    }
  }, [activeTab]);

  const fetchUserBooks = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/books/user/${user?._id}`);
      if (response.data.success) {
        setUserBooks(response.data.data.books);
      }
    } catch (error) {
      console.error('Failed to fetch user books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/balance/transactions');
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/offers/user');
      if (response.data.success) {
        setOffers(response.data.data.offers);
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const response = await api.put('/api/auth/profile', profileData);
      if (response.data.success) {
        updateUser(response.data.data.user);
        setEditingProfile(false);
        alert('Profile updated successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to update profile');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const remaining = end - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>My Profile</h1>
      
      {/* Tab Navigation */}
      <div style={{ borderBottom: '2px solid #eee', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'books', label: 'My Books' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'offers', label: 'Offers' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '1rem 0',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
                color: activeTab === tab.key ? '#007bff' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Profile Info */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
              <h3>Profile Information</h3>
              
              {editingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={updateProfile}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileData({ username: user.username, email: user.email });
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p><strong>Username:</strong> {user.username}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                  
                  <button
                    onClick={() => setEditingProfile(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '1rem'
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Balance Info */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
              <h3>Account Balance</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745', margin: '1rem 0' }}>
                {formatPrice(user.balance)}
              </p>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Available for purchases and bids
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '2rem' }}>
            <h3>Quick Actions</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link
                to="/create-book"
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}
              >
                📚 Sell a Book
              </Link>
              
              <Link
                to="/books"
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}
              >
                🔍 Browse Books
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* My Books Tab */}
      {activeTab === 'books' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>My Book Listings</h3>
            <Link
              to="/create-book"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px'
              }}
            >
              Add New Book
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : userBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              You haven't listed any books yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {userBooks.map(book => (
                <div key={book._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
                  <Link to={`/books/${book._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{book.title}</h4>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>by {book.author}</p>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#888' }}>
                      {book.condition} condition
                    </p>
                    
                    {book.listingType === 'auction' && (
                      <div>
                        <p style={{ margin: '0', fontWeight: 'bold', color: '#e74c3c' }}>
                          Current Bid: {formatPrice(book.currentBid || book.startingBid || 0)}
                        </p>
                        {book.auctionEndTime && (
                          <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                            {book.isAuctionActive ? `Ends in: ${getTimeRemaining(book.auctionEndTime)}` : 'Ended'}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {book.listingType === 'fixed-price' && (
                      <p style={{ margin: '0', fontWeight: 'bold', color: '#27ae60' }}>
                        Price: {formatPrice(book.fixedPrice || 0)}
                      </p>
                    )}
                    
                    {book.listingType === 'trade-only' && (
                      <p style={{ margin: '0', fontWeight: 'bold', color: '#3498db' }}>
                        Trade Only
                      </p>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          <h3>Transaction History</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No transactions yet.
            </div>
          ) : (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              {transactions.map((transaction, index) => (
                <div
                  key={transaction._id}
                  style={{
                    padding: '1rem',
                    borderBottom: index < transactions.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} - {transaction.book?.title}
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                      {transaction.buyer?._id === user._id ? 'Purchased from' : 'Sold to'} {' '}
                      {transaction.buyer?._id === user._id ? transaction.seller?.username : transaction.buyer?.username}
                    </p>
                    <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    {transaction.amount && (
                      <p style={{ 
                        margin: '0', 
                        fontWeight: 'bold',
                        color: transaction.buyer?._id === user._id ? '#e74c3c' : '#27ae60'
                      }}>
                        {transaction.buyer?._id === user._id ? '-' : '+'}{formatPrice(transaction.amount)}
                      </p>
                    )}
                    <p style={{ 
                      margin: '0', 
                      fontSize: '0.9rem',
                      color: transaction.status === 'completed' ? '#27ae60' : '#666'
                    }}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div>
          <h3>My Offers</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
          ) : offers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No offers yet.
            </div>
          ) : (
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              {offers.map((offer, index) => (
                <div
                  key={offer._id}
                  style={{
                    padding: '1rem',
                    borderBottom: index < offers.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <Link 
                        to={`/books/${offer.book._id}`}
                        style={{ textDecoration: 'none', color: '#007bff' }}
                      >
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                          {offer.book.title}
                        </p>
                      </Link>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                        by {offer.book.author}
                      </p>
                      {offer.message && (
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          "{offer.message}"
                        </p>
                      )}
                      <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
                        {new Date(offer.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {formatPrice(offer.amount)}
                      </p>
                      <p style={{ 
                        margin: '0',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: 
                          offer.status === 'accepted' ? '#d4edda' :
                          offer.status === 'rejected' ? '#f8d7da' :
                          offer.status === 'countered' ? '#fff3cd' : '#e2e3e5',
                        color:
                          offer.status === 'accepted' ? '#155724' :
                          offer.status === 'rejected' ? '#721c24' :
                          offer.status === 'countered' ? '#856404' : '#383d41'
                      }}>
                        {offer.status.toUpperCase()}
                      </p>
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

export default ProfilePage;