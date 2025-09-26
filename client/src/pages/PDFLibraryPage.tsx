import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  X, 
  Download, 
  Calendar, 
  FileText, 
  Tag, 
  BarChart3,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface PDFBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  downloadUrl: string;
  coverImage: string;
  fileSize: string;
  pages: number;
  language: string;
  publishedYear: number;
  downloads: number;
  rating: number;
  contributedBy?: string;
  isUserContributed?: boolean;
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

const PDFLibraryPage: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<PDFBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [showContributeModal, setShowContributeModal] = useState(false);
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
    'All Categories',
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

  // Mock data for free PDF books
  const mockBooks: PDFBook[] = [
    {
      id: '1',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      description: 'A classic American novel exploring themes of wealth, love, and the American Dream in the Jazz Age.',
      category: 'Literature',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f.jpg',
      fileSize: '2.1 MB',
      pages: 180,
      language: 'English',
      publishedYear: 1925,
      downloads: 15420,
      rating: 4.2
    },
    {
      id: '2',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      description: 'A romantic novel that critiques the British landed gentry at the end of the 18th century.',
      category: 'Literature',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c.jpg',
      fileSize: '1.8 MB',
      pages: 432,
      language: 'English',
      publishedYear: 1813,
      downloads: 12350,
      rating: 4.5
    },
    {
      id: '3',
      title: 'The Art of War',
      author: 'Sun Tzu',
      description: 'An ancient Chinese military treatise dating from the Late Spring and Autumn Period.',
      category: 'Philosophy',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73.jpg',
      fileSize: '1.2 MB',
      pages: 96,
      language: 'English',
      publishedYear: -500,
      downloads: 8920,
      rating: 4.0
    },
    {
      id: '4',
      title: 'A Brief History of Time',
      author: 'Stephen Hawking',
      description: 'A landmark volume in science writing that explores cosmology and the nature of time.',
      category: 'Science',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d.jpg',
      fileSize: '3.5 MB',
      pages: 256,
      language: 'English',
      publishedYear: 1988,
      downloads: 18750,
      rating: 4.7
    },
    {
      id: '5',
      title: 'The Wealth of Nations',
      author: 'Adam Smith',
      description: 'An inquiry into the nature and causes of the wealth of nations - foundational economics text.',
      category: 'Business',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f.jpg',
      fileSize: '4.2 MB',
      pages: 720,
      language: 'English',
      publishedYear: 1776,
      downloads: 6540,
      rating: 4.1
    },
    {
      id: '6',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      description: 'A Gothic novel that tells the story of Victor Frankenstein and his creation.',
      category: 'Fiction',
      downloadUrl: '#',
      coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570.jpg',
      fileSize: '2.3 MB',
      pages: 280,
      language: 'English',
      publishedYear: 1818,
      downloads: 9870,
      rating: 4.3
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setBooks(mockBooks);
      setLoading(false);
    }, 1000);

    // Listen for custom event to open PDF modal from dashboard
    const handleOpenPDFModal = () => {
      setShowContributeModal(true);
    };

    window.addEventListener('openPDFModal', handleOpenPDFModal);

    return () => {
      window.removeEventListener('openPDFModal', handleOpenPDFModal);
    };
  }, []);

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || selectedCategory === 'All Categories' || 
                           book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.downloads - a.downloads;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return b.publishedYear - a.publishedYear;
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const handleDownload = (book: PDFBook) => {
    // In a real app, this would trigger the actual download or redirect to external link
    if (book.downloadUrl === '#') {
      alert(`Downloading "${book.title}" by ${book.author}`);
    } else {
      window.open(book.downloadUrl, '_blank');
    }
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

      // Create new PDF book entry with default cover if none provided
      const newBook: PDFBook = {
        id: Date.now().toString(),
        ...contributeForm,
        coverImage: contributeForm.coverImage || getRandomDefaultCover(),
        fileSize: 'Unknown',
        downloads: 0,
        rating: 0,
        contributedBy: user?.username || 'Anonymous',
        isUserContributed: true
      };

      // Add to books list
      setBooks(prev => [newBook, ...prev]);

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
      setShowContributeModal(false);

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
      <div className="container py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-library-page">
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4">
                <FileText className="inline mr-2" size={32} />
                Free PDF Library
              </h1>
              <p className="text-lg text-secondary">
                Discover thousands of free books in digital format. Download classics, 
                educational content, and more at no cost.
              </p>
            </div>
            {user && (
              <button
                onClick={() => setShowContributeModal(true)}
                className="btn btn-primary btn-large"
              >
                <Plus size={20} />
                Contribute PDF
              </button>
            )}
          </div>
          {!user && (
            <div className="bg-secondary rounded-lg p-4 mt-4">
              <p className="text-secondary">
                <Link to="/login" className="text-accent font-semibold">Login</Link> to contribute your own PDFs to the community library
              </p>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-secondary rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Search Books</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-input form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="form-label">Sort By</label>
              <select
                className="form-input form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popular">Most Downloaded</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-secondary">
            Found {sortedBooks.length} free books
          </p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-primary text-white rounded-full text-sm">
              {sortedBooks.filter(b => !b.isUserContributed).length} Official
            </span>
            <span className="px-3 py-1 bg-accent text-white rounded-full text-sm">
              {sortedBooks.filter(b => b.isUserContributed).length} Community
            </span>
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBooks.map((book) => (
            <div key={book.id} className="card pdf-book-card">
              <div className="pdf-book-image">
                <img src={book.coverImage || getRandomDefaultCover()} alt={book.title} />
                <div className="pdf-badge">
                  <FileText size={14} />
                  <span>PDF</span>
                </div>
                {book.isUserContributed && (
                  <div className="community-badge">
                    <span>Community</span>
                  </div>
                )}
              </div>
              
              <div className="pdf-book-content">
                <h3 className="card-title">{book.title}</h3>
                <p className="text-secondary mb-2">by {book.author}</p>
                <p className="text-sm text-muted mb-4">{book.description}</p>
                
                <div className="pdf-book-meta">
                  <div className="meta-item">
                    <BarChart3 size={14} />
                    <span>{book.rating > 0 ? `${book.rating}/5` : 'New'} ({book.downloads.toLocaleString()} downloads)</span>
                  </div>
                  <div className="meta-item">
                    <FileText size={14} />
                    <span>{book.pages > 0 ? `${book.pages} pages` : 'Unknown pages'} • {book.fileSize}</span>
                  </div>
                  <div className="meta-item">
                    <Tag size={14} />
                    <span>{book.category}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{book.publishedYear > 0 ? book.publishedYear : 'Ancient'}</span>
                  </div>
                  {book.contributedBy && (
                    <div className="meta-item">
                      <span className="text-accent">Contributed by {book.contributedBy}</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDownload(book)}
                  className="btn btn-primary w-full mt-4"
                >
                  {book.isUserContributed ? <ExternalLink size={16} /> : <Download size={16} />}
                  {book.isUserContributed ? 'Open External Link' : 'Download Free PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {sortedBooks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4"><BookOpen size={96} /></div>
            <h3 className="text-xl font-semibold mb-2">No books found</h3>
            <p className="text-secondary">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-secondary rounded-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">About Our Free PDF Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2"><FileText size={48} /></div>
                <h3 className="font-semibold mb-2">Public Domain & Community</h3>
                <p className="text-sm text-secondary">
                  Official public domain books plus community-contributed resources
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2"><Download size={48} /></div>
                <h3 className="font-semibold mb-2">Completely Free</h3>
                <p className="text-sm text-secondary">
                  No registration required. Download as many books as you want
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2"><ExternalLink size={48} /></div>
                <h3 className="font-semibold mb-2">External Links</h3>
                <p className="text-sm text-secondary">
                  Community PDFs link to external hosting (Google Drive, etc.)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribute PDF Modal */}
      {showContributeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary rounded-2xl max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Contribute a PDF</h2>
                <button
                  onClick={() => setShowContributeModal(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleContributeSubmit} className="space-y-4">
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
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    value={contributeForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Brief description of the book"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input form-select"
                      value={contributeForm.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                    >
                      {categories.filter(c => c !== 'All Categories').map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Pages</label>
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
                    <label className="form-label">Published Year</label>
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
                  <label className="form-label">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={contributeForm.coverImage}
                    onChange={(e) => handleFormChange('coverImage', e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                  />
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
                    onClick={() => setShowContributeModal(false)}
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

export default PDFLibraryPage;