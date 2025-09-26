import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  condition: string;
  category: string;
  images: string[];
  listingType: 'auction' | 'fixed-price' | 'trade-only';
  currentBid?: number;
  startingBid?: number;
  fixedPrice?: number;
  auctionEndTime?: string;
  isAuctionActive?: boolean;
  seller: {
    _id: string;
    username: string;
  };
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [listingType, setListingType] = useState(searchParams.get('type') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');

  const categories = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 
    'Biography', 'Self-Help', 'Business', 'Art', 'Children', 'Other'
  ];

  const conditions = ['new', 'like-new', 'good', 'fair', 'poor'];
  const listingTypes = ['auction', 'fixed-price', 'trade-only'];

  useEffect(() => {
    performSearch();
  }, [searchParams]);

  const performSearch = async () => {
    setLoading(true);
    
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (category) params.append('category', category);
    if (listingType) params.append('type', listingType);
    if (condition) params.append('condition', condition);

    try {
      const response = await fetch(`/api/books/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (category) params.append('category', category);
    if (listingType) params.append('type', listingType);
    if (condition) params.append('condition', condition);
    
    setSearchParams(params);
  };

  const formatPrice = (book: Book) => {
    if (book.listingType === 'auction') {
      return `Current bid: $${book.currentBid || book.startingBid}`;
    } else if (book.listingType === 'fixed-price') {
      return `Price: $${book.fixedPrice}`;
    } else {
      return 'Trade only';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Search Books</h1>
        
        <form onSubmit={handleSearch} style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or description..."
              className="filter-input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>
      </div>

        <div className="filters-container">
          <div className="filters-grid">
            <div className="form-group">
              <label className="form-label">Category:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-select">
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Listing Type:</label>
            <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="filter-select">
              <option value="">All Types</option>
              {listingTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Condition:</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="filter-select">
              <option value="">All Conditions</option>
              {conditions.map(cond => (
                <option key={cond} value={cond}>
                  {cond.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button onClick={updateSearchParams} className="btn btn-primary" style={{ width: '100%' }}>
              Apply Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span style={{ marginLeft: '1rem' }}>Searching...</span>
          </div>
        ) : (
          <>
            <div className="results-header">
              <p className="results-count">{books.length} book{books.length !== 1 ? 's' : ''} found</p>
            </div>
            
            {books.length === 0 ? (
              <div className="empty-state">
                <h3>No books found</h3>
                <p>Try adjusting your search criteria or browse all books.</p>
              </div>
            ) : (
              <div className="books-grid">
                {books.map(book => (
                  <div key={book._id} className="book-card">
                    <div className="book-card-image">
                      {book.images?.[0] ? (
                        <img src={book.images[0]} alt={book.title} />
                      ) : (
                        <div className="book-card-placeholder">No Image</div>
                      )}
                      <div className={`book-card-badge ${book.listingType}`}>
                        {book.listingType === 'auction' ? 'Bid' : 
                         book.listingType === 'fixed-price' ? 'Buy' : 'Trade'}
                      </div>
                    </div>
                    
                    <div className="book-card-content">
                      <h3 className="book-card-title">{book.title}</h3>
                      <p className="book-card-author">by {book.author}</p>
                      <div className="book-card-meta">
                        <p className="book-card-condition">Condition: {book.condition}</p>
                        <p className="book-card-seller">Seller: {book.seller.username}</p>
                      </div>
                      <div className="book-card-footer">
                        <p className={`book-card-price ${book.listingType}`}>{formatPrice(book)}</p>
                        
                        {book.listingType === 'auction' && book.isAuctionActive && (
                          <p className="book-card-time">
                            Ends: {new Date(book.auctionEndTime!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="book-card-actions">
                        <a 
                          href={`/books/${book._id}`} 
                          className="book-card-btn book-card-btn-primary"
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;