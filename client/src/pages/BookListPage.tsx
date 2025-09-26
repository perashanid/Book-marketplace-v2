import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

interface Book {
  _id: string;
  title: string;
  author: string;
  description: string;
  condition: string;
  category: string;
  images: string[];
  listingType: 'auction' | 'fixed-price' | 'trade-only';
  fixedPrice?: number;
  currentBid?: number;
  startingBid?: number;
  auctionEndTime?: string;
  isAuctionActive?: boolean;
  seller: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

interface SearchFilters {
  search: string;
  category: string;
  condition: string;
  listingType: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const BookListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: '',
    condition: '',
    listingType: searchParams.get('type') || '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 12
  });

  const fetchBooks = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await api.get(`/api/books?${params}`);
      
      if (response.data.success) {
        setBooks(response.data.data.books);
        setPagination(response.data.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch books:', err);
      // Fallback to mock data
      setBooks(getMockBooksForListing());
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 15,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 12
      });
      setError('Server not available - showing demo data');
    } finally {
      setLoading(false);
    }
  };

  const getMockBooksForListing = (): Book[] => {
    const allMockBooks: Book[] = [
      {
        _id: '1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A classic American novel set in the Jazz Age.',
        condition: 'like-new',
        category: 'Fiction',
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f.jpg'],
        listingType: 'auction' as const,
        currentBid: 15.00,
        startingBid: 15.00,
        auctionEndTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        isAuctionActive: true,
        seller: { _id: '1', username: 'bookworm123' },
        createdAt: new Date().toISOString()
      },
      {
        _id: '2',
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        description: 'Comprehensive textbook on algorithms.',
        condition: 'good',
        category: 'Textbook',
        images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765.jpg'],
        listingType: 'fixed-price' as const,
        fixedPrice: 85.00,
        seller: { _id: '2', username: 'readerlover' },
        createdAt: new Date().toISOString()
      },
      {
        _id: '3',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'Pulitzer Prize-winning novel.',
        condition: 'fair',
        category: 'Fiction',
        images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570.jpg'],
        listingType: 'trade-only' as const,
        seller: { _id: '3', username: 'novelenthusiast' },
        createdAt: new Date().toISOString()
      }
      // Add more mock books as needed
    ];

    // Filter based on current filters
    return allMockBooks.filter(book => {
      if (filters.listingType && book.listingType !== filters.listingType) return false;
      if (filters.category && book.category !== filters.category) return false;
      if (filters.condition && book.condition !== filters.condition) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return book.title.toLowerCase().includes(searchLower) || 
               book.author.toLowerCase().includes(searchLower);
      }
      return true;
    });
  };

  useEffect(() => {
    fetchBooks();
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page: number) => {
    fetchBooks(page);
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
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && books.length === 0) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading books...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Browse Books</h1>
        
        {/* Quick Filter Buttons */}
        <div className="quick-filters">
          <button 
            className={`filter-btn ${filters.listingType === '' ? 'active' : ''}`}
            onClick={() => handleFilterChange('listingType', '')}
          >
            <span className="filter-icon">All</span>
            All Books
            <span className="filter-count">({pagination.totalCount})</span>
          </button>
          <button 
            className={`filter-btn ${filters.listingType === 'auction' ? 'active' : ''}`}
            onClick={() => handleFilterChange('listingType', 'auction')}
          >
            <span className="filter-icon">Bid</span>
            Auctions
          </button>
          <button 
            className={`filter-btn ${filters.listingType === 'fixed-price' ? 'active' : ''}`}
            onClick={() => handleFilterChange('listingType', 'fixed-price')}
          >
            <span className="filter-icon">Buy</span>
            Buy Now
          </button>
          <button 
            className={`filter-btn ${filters.listingType === 'trade-only' ? 'active' : ''}`}
            onClick={() => handleFilterChange('listingType', 'trade-only')}
          >
            <span className="filter-icon">Trade</span>
            Trade Only
          </button>
        </div>
      </div>
      
      {/* Advanced Filters */}
      <div className="filters-container">
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Advanced Filters</h3>
        <div className="filters-grid">
          <input
            type="text"
            placeholder="Search books..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />
          
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="fiction">Fiction</option>
            <option value="non-fiction">Non-Fiction</option>
            <option value="textbook">Textbook</option>
            <option value="science">Science</option>
            <option value="history">History</option>
            <option value="biography">Biography</option>
          </select>
          
          <select
            value={filters.condition}
            onChange={(e) => handleFilterChange('condition', e.target.value)}
            className="filter-select"
          >
            <option value="">All Conditions</option>
            <option value="new">New</option>
            <option value="like-new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
          
          <select
            value={filters.listingType}
            onChange={(e) => handleFilterChange('listingType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="auction">Auction</option>
            <option value="fixed-price">Fixed Price</option>
            <option value="trade-only">Trade Only</option>
          </select>
        </div>
        
        <div className="filters-row">
          <input
            type="number"
            placeholder="Min Price"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="filter-input"
            style={{ width: '120px' }}
          />
          <input
            type="number"
            placeholder="Max Price"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="filter-input"
            style={{ width: '120px' }}
          />
          
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              handleFilterChange('sortBy', sortBy);
              handleFilterChange('sortOrder', sortOrder as 'asc' | 'desc');
            }}
            className="filter-select"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="fixedPrice-asc">Price Low to High</option>
            <option value="fixedPrice-desc">Price High to Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Results Count */}
      <div className="results-header">
        <div>
          <p className="results-count">
            Found {pagination.totalCount} books
            {filters.listingType && (
              <span className="active-filter">
                {' '}in {filters.listingType === 'fixed-price' ? 'Buy Now' : 
                        filters.listingType === 'trade-only' ? 'Trade Only' : 
                        filters.listingType === 'auction' ? 'Auctions' : 'All'}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Books Grid */}
      <div className="books-grid">
        {books.map((book) => (
          <div key={book._id} className="book-card">
            <Link to={`/books/${book._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="book-card-image">
                {book.images.length > 0 ? (
                  <img
                    src={book.images[0]}
                    alt={book.title}
                  />
                ) : (
                  <div className="book-card-placeholder">📚</div>
                )}
                <div className={`book-card-badge ${book.listingType}`}>
                  {book.listingType === 'auction' ? '🔨' : 
                   book.listingType === 'fixed-price' ? '💰' : '🔄'}
                </div>
              </div>
              
              <div className="book-card-content">
                <h3 className="book-card-title">{book.title}</h3>
                <p className="book-card-author">by {book.author}</p>
                <div className="book-card-meta">
                  <p className="book-card-condition">Condition: {book.condition}</p>
                  <p className="book-card-seller">Category: {book.category}</p>
                </div>
              
                <div className="book-card-footer">
                  {book.listingType === 'auction' && (
                    <div>
                      <p className="book-card-price auction">
                        Current Bid: {formatPrice(book.currentBid || book.startingBid || 0)}
                      </p>
                      {book.auctionEndTime && (
                        <p className="book-card-time">
                          {book.isAuctionActive ? `Ends in: ${getTimeRemaining(book.auctionEndTime)}` : 'Auction Ended'}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {book.listingType === 'fixed-price' && (
                    <p className="book-card-price">
                      Price: {formatPrice(book.fixedPrice || 0)}
                    </p>
                  )}
                  
                  {book.listingType === 'trade-only' && (
                    <p className="book-card-price trade">
                      Trade Only
                    </p>
                  )}
                </div>
                
                <p className="book-card-seller">Seller: {book.seller.username}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {books.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No books found matching your criteria.
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: pagination.hasPrevPage ? 'white' : '#f5f5f5',
              cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed'
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: pagination.hasNextPage ? 'white' : '#f5f5f5',
              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BookListPage;