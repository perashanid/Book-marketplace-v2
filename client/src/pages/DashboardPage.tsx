import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  BookOpen, 
  Flame, 
  TrendingUp, 
  Plus, 
  Search, 
  ArrowLeftRight, 
  FileText,
  DollarSign,
  Bell,
  Upload,
  Activity,
  Eye,
  ShoppingCart,
  X
} from 'lucide-react';

// Default cover images for PDFs without covers
const DEFAULT_PDF_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1532012197267-da84d127e765.jpg?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794.jpg?w=400&h=600&fit=crop'
];

const getRandomDefaultCover = () => {
  return DEFAULT_PDF_COVERS[Math.floor(Math.random() * DEFAULT_PDF_COVERS.length)];
};

interface DashboardStats {
  totalBooks: number;
  activeAuctions: number;
  completedSales: number;
  pendingTrades: number;
  unreadNotifications: number;
  totalEarnings: number;
  accountBalance: number;
}

interface ContributePDFForm {
  title: string;
  author: string;
  description: string;
  category: string;
  downloadUrl: string;
  coverImage: string;
  pages: number;
  publishedYear: number;
  language: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    activeAuctions: 0,
    completedSales: 0,
    pendingTrades: 0,
    unreadNotifications: 0,
    totalEarnings: 0,
    accountBalance: user?.balance || 0
  });
  const [loading, setLoading] = useState(true);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [contributeForm, setContributeForm] = useState<ContributePDFForm>({
    title: '',
    author: '',
    description: '',
    category: 'Fiction',
    downloadUrl: '',
    coverImage: '',
    pages: 0,
    publishedYear: new Date().getFullYear(),
    language: 'English'
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  const categories = [
    'Fiction',
    'Non-Fiction',
    'Science',
    'Technology',
    'History',
    'Philosophy',
    'Literature',
    'Education',
    'Business',
    'Self-Help'
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPDF = () => {
    setShowPDFModal(true);
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      // Validate form
      if (!contributeForm.title || !contributeForm.author || !contributeForm.downloadUrl) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate URL
      try {
        new URL(contributeForm.downloadUrl);
      } catch {
        alert('Please enter a valid download URL');
        return;
      }

      // Create PDF data with default cover if none provided
      const pdfData = {
        ...contributeForm,
        coverImage: contributeForm.coverImage || getRandomDefaultCover(),
        contributedBy: user?.username || 'Anonymous',
        isUserContributed: true
      };

      // In a real app, this would make an API call to save the PDF
      console.log('Contributing PDF:', pdfData);

      // Reset form and close modal
      setContributeForm({
        title: '',
        author: '',
        description: '',
        category: 'Fiction',
        downloadUrl: '',
        coverImage: '',
        pages: 0,
        publishedYear: new Date().getFullYear(),
        language: 'English'
      });
      setShowPDFModal(false);

      alert('PDF contributed successfully! Thank you for sharing with the community.');
    } catch (error) {
      console.error('Error contributing PDF:', error);
      alert('Failed to contribute PDF. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFormChange = (field: keyof ContributePDFForm, value: string | number) => {
    setContributeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Modern Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1 className="dashboard-title">Welcome back, {user?.username}! 👋</h1>
            <p className="dashboard-subtitle">Manage your books, trades, and earnings all in one place</p>
          </div>
          <div className="header-actions">
            <Link to="/create-book" className="btn btn-primary">
              <Plus size={18} />
              List Book
            </Link>
            <button onClick={handleAddPDF} className="btn btn-accent">
              <Upload size={18} />
              Add PDF
            </button>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="modern-stats-grid">
        <div className="modern-stat-card balance-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <Wallet size={24} />
            </div>
            <div className="stat-trend">
              <TrendingUp size={16} />
              <span>+12%</span>
            </div>
          </div>
          <div className="stat-content">
            <h3>Balance</h3>
            <div className="stat-value">${stats.accountBalance.toFixed(2)}</div>
            <p className="stat-description">Available funds</p>
          </div>
        </div>

        <div className="modern-stat-card books-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <div className="stat-trend">
              <Activity size={16} />
              <span>{stats.activeAuctions}</span>
            </div>
          </div>
          <div className="stat-content">
            <h3>My Books</h3>
            <div className="stat-value">{stats.totalBooks}</div>
            <p className="stat-description">Listed items</p>
          </div>
        </div>

        <div className="modern-stat-card auctions-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <Flame size={24} />
            </div>
            <div className="stat-trend">
              <Eye size={16} />
              <span>Live</span>
            </div>
          </div>
          <div className="stat-content">
            <h3>Auctions</h3>
            <div className="stat-value">{stats.activeAuctions}</div>
            <p className="stat-description">Active bids</p>
          </div>
        </div>

        <div className="modern-stat-card earnings-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <TrendingUp size={24} />
            </div>
            <div className="stat-trend">
              <ShoppingCart size={16} />
              <span>{stats.completedSales}</span>
            </div>
          </div>
          <div className="stat-content">
            <h3>Earnings</h3>
            <div className="stat-value">${stats.totalEarnings.toFixed(2)}</div>
            <p className="stat-description">Total sales</p>
          </div>
        </div>
      </div>

      {/* Modern Action Cards */}
      <div className="modern-actions-container">
        <div className="actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="modern-actions-grid">
            <Link to="/create-book" className="modern-action-card primary-action">
              <div className="action-icon-wrapper">
                <Plus size={28} />
              </div>
              <div className="action-content">
                <h3>List a Book</h3>
                <p>Sell or auction your books</p>
              </div>
            </Link>

            <Link to="/books" className="modern-action-card">
              <div className="action-icon-wrapper">
                <Search size={28} />
              </div>
              <div className="action-content">
                <h3>Browse Books</h3>
                <p>Find books to buy or trade</p>
              </div>
            </Link>

            <button onClick={handleAddPDF} className="modern-action-card">
              <div className="action-icon-wrapper">
                <Upload size={28} />
              </div>
              <div className="action-content">
                <h3>Add PDF</h3>
                <p>Share digital books</p>
              </div>
            </button>

            <Link to="/pdf-library" className="modern-action-card">
              <div className="action-icon-wrapper">
                <FileText size={28} />
              </div>
              <div className="action-content">
                <h3>PDF Library</h3>
                <p>Access digital books</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="actions-section">
          <h2 className="section-title">Manage</h2>
          <div className="modern-actions-grid">
            <Link to="/offers" className="modern-action-card">
              <div className="action-icon-wrapper">
                <DollarSign size={28} />
              </div>
              <div className="action-content">
                <h3>My Offers</h3>
                <p>View received and sent offers</p>
              </div>
            </Link>

            <Link to="/trades" className="modern-action-card">
              <div className="action-icon-wrapper">
                <ArrowLeftRight size={28} />
              </div>
              <div className="action-content">
                <h3>Trade Requests</h3>
                <p>Manage trade proposals</p>
              </div>
            </Link>

            <Link to="/notifications" className="modern-action-card">
              <div className="action-icon-wrapper">
                <Bell size={28} />
              </div>
              <div className="action-content">
                <h3>Notifications</h3>
                <p>Stay updated on activity</p>
              </div>
              {stats.unreadNotifications > 0 && (
                <div className="notification-badge">{stats.unreadNotifications}</div>
              )}
            </Link>

            <div className="modern-action-card disabled">
              <div className="action-icon-wrapper">
                <Activity size={28} />
              </div>
              <div className="action-content">
                <h3>Analytics</h3>
                <p>Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribute PDF Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary rounded-2xl max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Contribute a PDF</h2>
                <button
                  onClick={() => setShowPDFModal(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleContributeSubmit} className="space-y-4">
                <div className="bg-secondary rounded-lg p-4 mb-4">
                  <p className="text-sm text-secondary">
                    <strong>Required fields:</strong> Only Title, Author, and Download Link are required. 
                    All other fields are optional and help improve the book listing.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contributeForm.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      placeholder="Enter book title"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Author *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contributeForm.author}
                      onChange={(e) => handleFormChange('author', e.target.value)}
                      placeholder="Enter author name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Download URL *</label>
                  <input
                    type="url"
                    className="form-input"
                    value={contributeForm.downloadUrl}
                    onChange={(e) => handleFormChange('downloadUrl', e.target.value)}
                    placeholder="https://drive.google.com/... or other hosting link"
                    required
                  />
                  <p className="text-sm text-secondary mt-1">
                    Provide a direct link to the PDF file (Google Drive, Dropbox, etc.)
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-input form-textarea"
                    value={contributeForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Brief description of the book (optional)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="form-label">Category (Optional)</label>
                    <select
                      className="form-input form-select"
                      value={contributeForm.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pages (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={contributeForm.pages || ''}
                      onChange={(e) => handleFormChange('pages', parseInt(e.target.value) || 0)}
                      placeholder="Number of pages"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Published Year (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={contributeForm.publishedYear}
                      onChange={(e) => handleFormChange('publishedYear', parseInt(e.target.value) || new Date().getFullYear())}
                      placeholder="Publication year"
                      min="1"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={contributeForm.coverImage}
                    onChange={(e) => handleFormChange('coverImage', e.target.value)}
                    placeholder="https://example.com/cover.jpg (will use default if empty)"
                  />
                  <p className="text-sm text-secondary mt-1">
                    If no cover image is provided, a default book cover will be used
                  </p>
                </div>

                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Guidelines:</h4>
                  <ul className="text-sm text-secondary space-y-1">
                    <li>• Only share books that are in the public domain or you have rights to distribute</li>
                    <li>• Ensure the download link is publicly accessible</li>
                    <li>• Use reputable hosting services (Google Drive, Dropbox, etc.)</li>
                    <li>• Provide accurate information about the book</li>
                  </ul>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPDFModal(false)}
                    className="btn btn-secondary flex-1"
                    disabled={submitLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={submitLoading}
                  >
                    {submitLoading ? 'Contributing...' : 'Contribute PDF'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;