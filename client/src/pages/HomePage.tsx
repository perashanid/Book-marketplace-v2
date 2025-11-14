import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { 
  Search, 
  Plus, 
  Flame, 
  DollarSign, 
  RefreshCw, 
  FileText, 
  BookOpen, 
  Shield, 
  Star,
  Rocket,
  Eye,
  Users,
  Globe,
  TrendingUp
} from 'lucide-react';
import './HomePage.css';

// Default cover images for books without covers
const DEFAULT_BOOK_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1532012197267-da84d127e765.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794.jpg?w=400&h=600&fit=crop'
];

const getRandomDefaultCover = () => {
  return DEFAULT_BOOK_COVERS[Math.floor(Math.random() * DEFAULT_BOOK_COVERS.length)];
};

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
  images: string[];
  seller: {
    _id: string;
    username: string;
  };
}

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBooks: 0,
    activeAuctions: 0,
    totalUsers: 0,
    completedTrades: 0
  });

  useEffect(() => {
    fetchFeaturedBooks();
    fetchStats();
  }, []);

  const fetchFeaturedBooks = async () => {
    try {
      setBooksLoading(true);
      const response = await api.get('/api/books?limit=6&sortBy=createdAt&sortOrder=desc');
      if (response.data.success) {
        setFeaturedBooks(response.data.data.books);
      }
    } catch (error) {
      console.error('Failed to fetch featured books:', error);
      setFeaturedBooks([]);
    } finally {
      setBooksLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // This would be a real API call in production
      setStats({
        totalBooks: 1500,
        activeAuctions: 45,
        totalUsers: 850,
        completedTrades: 320
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  return (
    <div className="home-page">


      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="hero-logo">
            <img src="/book-logo.svg" alt="Book Marketplace" className="hero-logo-image" />
          </div>

          <h1 className="hero-title">
            The Ultimate <span className="gradient-text">Book Marketplace</span>
          </h1>
          <p className="hero-subtitle">
            Buy, sell, auction, and trade books with fellow readers worldwide. 
            Discover rare finds, get great deals, and connect with book lovers everywhere.
          </p>
          
          <div className="hero-actions">
            {user ? (
              <>
                <Link to="/books" className="btn btn-primary btn-large">
                  <span className="btn-icon"><Search size={20} /></span>
                  Browse Books
                </Link>
                <Link to="/create-book" className="btn btn-secondary btn-large">
                  <span className="btn-icon"><Plus size={20} /></span>
                  Sell Your Books
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  <span className="btn-icon"><Rocket size={20} /></span>
                  Get Started Free
                </Link>
                <Link to="/books" className="btn btn-secondary btn-large">
                  <span className="btn-icon"><Eye size={20} /></span>
                  Browse Books
                </Link>
              </>
            )}
          </div>

          <div className="hero-features">
            <div className="hero-feature">
              <span className="feature-icon"><Flame size={16} /></span>
              <span>Live Auctions</span>
            </div>
            <div className="hero-feature">
              <span className="feature-icon"><DollarSign size={16} /></span>
              <span>Instant Buy</span>
            </div>
            <div className="hero-feature">
              <span className="feature-icon"><RefreshCw size={16} /></span>
              <span>Book Trading</span>
            </div>
            <div className="hero-feature">
              <span className="feature-icon"><FileText size={16} /></span>
              <span>Free PDFs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="featured-books">
        <div className="container">
          <div className="section-header">
            <h2>Latest Listings</h2>
            <p>Discover the newest books added to our marketplace</p>
            <Link to="/books" className="btn btn-accent">View All Books</Link>
          </div>
          
          {booksLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner"></div>
            </div>
          ) : featuredBooks.length > 0 ? (
            <div className="books-grid">
              {featuredBooks.map((book) => (
                <Link key={book._id} to={`/books/${book._id}`} className="book-card">
                  <div className="book-image">
                    <img src={book.images.length > 0 ? book.images[0] : getRandomDefaultCover()} alt={book.title} />
                    <div className="book-type-badge">
                      {book.listingType === 'auction' && <span className="badge auction"><Flame size={14} /> Auction</span>}
                      {book.listingType === 'fixed-price' && <span className="badge fixed"><DollarSign size={14} /> Buy Now</span>}
                      {book.listingType === 'trade-only' && <span className="badge trade"><RefreshCw size={14} /> Trade</span>}
                    </div>
                  </div>
                  
                  <div className="book-info">
                    <h3 className="book-title">{book.title}</h3>
                    <p className="book-author">by {book.author}</p>
                    <p className="book-condition">{book.condition} condition</p>
                    
                    <div className="book-price">
                      {book.listingType === 'auction' && (
                        <div>
                          <span className="price">{formatPrice(book.currentBid || book.startingBid || 0)}</span>
                          {book.auctionEndTime && book.isAuctionActive && (
                            <span className="time-remaining">{getTimeRemaining(book.auctionEndTime)}</span>
                          )}
                        </div>
                      )}
                      {book.listingType === 'fixed-price' && (
                        <span className="price">{formatPrice(book.fixedPrice || 0)}</span>
                      )}
                      {book.listingType === 'trade-only' && (
                        <span className="trade-text">Trade Only</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"><BookOpen size={96} /></div>
              <h3 className="text-xl font-semibold mb-2">No books available yet</h3>
              <p className="text-secondary mb-4">Be the first to list a book on our marketplace!</p>
              {user && (
                <Link to="/create-book" className="btn btn-primary">
                  List Your First Book
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Browse by Category</h2>
            <p>Find exactly what you're looking for</p>
          </div>
          
          <div className="categories-grid">
            <Link to="/books?category=fiction" className="category-card">
              <div className="category-image">
                <img src="https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=400&fit=crop" alt="Fiction" />
                <div className="category-overlay"></div>
              </div>
              <div className="category-content">
                <h3>Fiction</h3>
                <p>Novels, Stories & More</p>
              </div>
            </Link>
            
            <Link to="/books?category=non-fiction" className="category-card">
              <div className="category-image">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop" alt="Non-Fiction" />
                <div className="category-overlay"></div>
              </div>
              <div className="category-content">
                <h3>Non-Fiction</h3>
                <p>Biography, History & Essays</p>
              </div>
            </Link>
            
            <Link to="/books?category=textbooks" className="category-card">
              <div className="category-image">
                <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=400&fit=crop" alt="Textbooks" />
                <div className="category-overlay"></div>
              </div>
              <div className="category-content">
                <h3>Textbooks</h3>
                <p>Academic & Educational</p>
              </div>
            </Link>
            
            <Link to="/books?category=children" className="category-card">
              <div className="category-image">
                <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=400&fit=crop" alt="Children's Books" />
                <div className="category-overlay"></div>
              </div>
              <div className="category-content">
                <h3>Children's Books</h3>
                <p>Stories for Young Readers</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Start buying, selling, and trading in three simple steps</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-image">
                <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=300&fit=crop" alt="Create Account" />
              </div>
              <h3>Create Your Account</h3>
              <p>Sign up for free in seconds. No credit card required to start browsing and listing books.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-image">
                <img src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300&fit=crop" alt="List or Browse" />
              </div>
              <h3>List or Browse Books</h3>
              <p>Upload your books with photos and descriptions, or browse thousands of listings from other readers.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-image">
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&h=300&fit=crop" alt="Complete Transaction" />
              </div>
              <h3>Buy, Sell, or Trade</h3>
              <p>Complete secure transactions through our platform. Rate your experience and build your reputation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose BookMarket?</h2>
            <p>Everything you need to buy, sell, and trade books online</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Flame size={48} /></div>
              <h3>Live Auctions</h3>
              <p>
                Create exciting auctions with real-time bidding. Set your starting price 
                and watch buyers compete for your books.
              </p>
              <Link to="/books?type=auction" className="feature-link">
                Browse Auctions →
              </Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"><DollarSign size={48} /></div>
              <h3>Instant Purchase</h3>
              <p>
                Set fixed prices for immediate sales. Accept offers from buyers 
                and negotiate the perfect deal.
              </p>
              <Link to="/books?type=fixed-price" className="feature-link">
                Shop Now →
              </Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"><RefreshCw size={48} /></div>
              <h3>Book Trading</h3>
              <p>
                Exchange books directly without money. Perfect for discovering 
                new reads while sharing your collection.
              </p>
              <Link to="/books?type=trade-only" className="feature-link">
                Start Trading →
              </Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"><FileText size={48} /></div>
              <h3>Free PDF Library</h3>
              <p>
                Access thousands of free digital books. Download classics, 
                textbooks, and more at no cost.
              </p>
              <Link to="/pdf-library" className="feature-link">
                Browse PDFs →
              </Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"><Shield size={48} /></div>
              <h3>Secure Transactions</h3>
              <p>
                Built-in wallet system with secure payments. Your money is safe 
                until transactions are completed.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon"><Globe size={48} /></div>
              <h3>Global Community</h3>
              <p>
                Connect with book lovers worldwide. Share reviews, recommendations, 
                and build your reading network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>What Our Users Say</h2>
            <p>Join thousands of satisfied book lovers</p>
          </div>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-rating">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="testimonial-text">
                "I've sold over 50 textbooks on BookMarket and saved hundreds of dollars buying used books. 
                The auction feature is fantastic!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="Sarah" />
                </div>
                <div>
                  <div className="author-name">Sarah Johnson</div>
                  <div className="author-role">College Student</div>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-rating">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="testimonial-text">
                "The book trading feature is amazing! I've discovered so many great reads by exchanging books 
                with other members. Highly recommend!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" alt="Michael" />
                </div>
                <div>
                  <div className="author-name">Michael Chen</div>
                  <div className="author-role">Book Enthusiast</div>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-rating">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="testimonial-text">
                "As a teacher, I love finding affordable books for my classroom. BookMarket has been a 
                game-changer for building my library on a budget."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" alt="Emily" />
                </div>
                <div>
                  <div className="author-name">Emily Rodriguez</div>
                  <div className="author-role">Elementary Teacher</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon"><BookOpen size={48} /></div>
              <h3>{stats.totalBooks.toLocaleString()}+</h3>
              <p>Books Listed</p>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Users size={48} /></div>
              <h3>{stats.totalUsers.toLocaleString()}+</h3>
              <p>Active Users</p>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><TrendingUp size={48} /></div>
              <h3>{stats.completedTrades.toLocaleString()}+</h3>
              <p>Successful Trades</p>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><Flame size={48} /></div>
              <h3>{stats.activeAuctions}+</h3>
              <p>Live Auctions</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="cta">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to Start Your Book Journey?</h2>
              <p>Join thousands of book lovers buying, selling, and trading amazing books every day.</p>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-large">
                  <span className="btn-icon"><Rocket size={20} /></span>
                  Create Free Account
                </Link>
                <Link to="/books" className="btn btn-secondary btn-large">
                  <span className="btn-icon"><Eye size={20} /></span>
                  Browse Books First
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;