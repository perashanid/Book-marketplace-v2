import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface BookFormData {
  title: string;
  author: string;
  description: string;
  condition: string;
  category: string;
  images: string[];
  listingTypes: {
    fixedPrice: boolean;
    auction: boolean;
    tradeOnly: boolean;
  };
  startingBid: string;
  auctionDuration: string;
  fixedPrice: string;
  acceptsOffers: boolean;
}

const CreateBookPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageInput, setImageInput] = useState('');
  
  const categories = [
    'Fiction',
    'Non-Fiction',
    'Mystery & Thriller',
    'Romance',
    'Science Fiction & Fantasy',
    'Horror',
    'Historical Fiction',
    'Literary Fiction',
    'Young Adult',
    'Children\'s Books',
    'Biography & Autobiography',
    'History',
    'Science & Nature',
    'Health & Fitness',
    'Self-Help',
    'Business & Economics',
    'Politics & Social Sciences',
    'Philosophy',
    'Religion & Spirituality',
    'Psychology',
    'Education & Teaching',
    'Textbooks',
    'Reference',
    'Art & Design',
    'Photography',
    'Music',
    'Travel',
    'Cooking & Food',
    'Sports & Recreation',
    'Technology & Engineering',
    'Computer Science',
    'Mathematics',
    'Medical',
    'Law',
    'Poetry',
    'Drama & Plays',
    'Comics & Graphic Novels',
    'Manga',
    'Other'
  ];
  
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: '',
    description: '',
    condition: 'good',
    category: '',
    images: [],
    listingTypes: {
      fixedPrice: true,
      auction: false,
      tradeOnly: false
    },
    startingBid: '',
    auctionDuration: '7',
    fixedPrice: '',
    acceptsOffers: true
  });

  const handleInputChange = (field: keyof BookFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleListingTypeChange = (type: keyof BookFormData['listingTypes'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      listingTypes: {
        ...prev.listingTypes,
        [type]: checked
      }
    }));
  };

  const addImage = () => {
    if (imageInput.trim() && !formData.images.includes(imageInput.trim())) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageInput.trim()]
      }));
      setImageInput('');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.author.trim()) return 'Author is required';
    if (!formData.condition) return 'Condition is required';
    if (!formData.category.trim()) return 'Category is required';
    if (formData.images.length === 0) return 'At least one image is required';
    
    // Check if at least one listing type is selected
    const hasListingType = formData.listingTypes.fixedPrice || formData.listingTypes.auction || formData.listingTypes.tradeOnly;
    if (!hasListingType) return 'Please select at least one listing type';
    
    if (formData.listingTypes.auction) {
      if (!formData.startingBid || parseFloat(formData.startingBid) <= 0) {
        return 'Starting bid must be greater than 0 for auction';
      }
      if (!formData.auctionDuration || parseInt(formData.auctionDuration) <= 0) {
        return 'Auction duration must be greater than 0';
      }
    }
    
    if (formData.listingTypes.fixedPrice) {
      if (!formData.fixedPrice || parseFloat(formData.fixedPrice) <= 0) {
        return 'Fixed price must be greater than 0';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const submitData: any = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim(),
        condition: formData.condition,
        category: formData.category.trim(),
        images: formData.images,
        listingTypes: formData.listingTypes
      };

      if (formData.listingTypes.auction) {
        submitData.startingBid = parseFloat(formData.startingBid);
        submitData.auctionDuration = parseInt(formData.auctionDuration);
      }
      
      if (formData.listingTypes.fixedPrice) {
        submitData.fixedPrice = parseFloat(formData.fixedPrice);
        submitData.acceptsOffers = formData.acceptsOffers;
      }

      const response = await api.post('/api/books', submitData);

      if (response.data.success) {
        navigate(`/books/${response.data.data.book._id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create book listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Please log in to create a book listing.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Create Book Listing</h1>
        <p className="page-subtitle">List your physical book for sale, auction, or trade</p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-book-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3 className="section-title">Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter book title"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Author *</label>
              <input
                type="text"
                className="form-input"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Enter author name"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              placeholder="Describe the book's content, condition details, etc."
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Condition *</label>
              <select
                className="form-input form-select"
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                required
              >
                <option value="new">New</option>
                <option value="like-new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input form-select"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="form-section">
          <h3 className="section-title">Images *</h3>
          <p className="section-description">Add photos of your book. At least one image is required.</p>
          
          <div className="image-input-container">
            <input
              type="url"
              className="form-input"
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              placeholder="Enter image URL"
            />
            <button
              type="button"
              onClick={addImage}
              className="btn btn-primary"
              disabled={!imageInput.trim()}
            >
              Add Image
            </button>
          </div>
          
          {formData.images.length > 0 && (
            <div className="images-grid">
              {formData.images.map((image, index) => (
                <div key={index} className="image-preview">
                  <img
                    src={image}
                    alt={`Book image ${index + 1}`}
                    className="preview-image"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="remove-image-btn"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {formData.images.length === 0 && (
            <div className="no-images-message">
              <p>No images added yet. Please add at least one image of your book.</p>
            </div>
          )}
        </div>

        {/* Listing Types */}
        <div className="form-section">
          <h3 className="section-title">Listing Types</h3>
          <p className="section-description">Select one or more ways to list your book. You can offer multiple options to buyers.</p>
          
          <div className="checkbox-group">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={formData.listingTypes.fixedPrice}
                onChange={(e) => handleListingTypeChange('fixedPrice', e.target.checked)}
              />
              <span className="checkbox-label">Fixed Price Sale</span>
            </label>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={formData.listingTypes.auction}
                onChange={(e) => handleListingTypeChange('auction', e.target.checked)}
              />
              <span className="checkbox-label">Auction</span>
            </label>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={formData.listingTypes.tradeOnly}
                onChange={(e) => handleListingTypeChange('tradeOnly', e.target.checked)}
              />
              <span className="checkbox-label">Trade Only</span>
            </label>
          </div>

          {/* Fixed Price Options */}
          {formData.listingTypes.fixedPrice && (
            <div className="listing-options">
              <h4 className="options-title">Fixed Price Settings</h4>
              <div className="form-group">
                <label className="form-label">Price *</label>
                <input
                  type="number"
                  className="form-input price-input"
                  value={formData.fixedPrice}
                  onChange={(e) => handleInputChange('fixedPrice', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required={formData.listingTypes.fixedPrice}
                />
              </div>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={formData.acceptsOffers}
                  onChange={(e) => handleInputChange('acceptsOffers', e.target.checked)}
                />
                <span className="checkbox-label">Accept offers from buyers</span>
              </label>
            </div>
          )}

          {/* Auction Options */}
          {formData.listingTypes.auction && (
            <div className="listing-options">
              <h4 className="options-title">Auction Settings</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Starting Bid *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.startingBid}
                    onChange={(e) => handleInputChange('startingBid', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required={formData.listingTypes.auction}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Duration (days) *</label>
                  <select
                    className="form-input form-select"
                    value={formData.auctionDuration}
                    onChange={(e) => handleInputChange('auctionDuration', e.target.value)}
                    required={formData.listingTypes.auction}
                  >
                    <option value="1">1 day</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
              </div>
              
              {formData.listingTypes.fixedPrice && (
                <div className="form-group">
                  <p className="field-description">
                    <strong>Buy It Now:</strong> Since you've enabled Fixed Price, buyers can also purchase immediately at your fixed price during the auction.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trade Only Info */}
          {formData.listingTypes.tradeOnly && (
            <div className="listing-options">
              <h4 className="options-title">Trade Only Settings</h4>
              <div className="info-box">
                <p>
                  This book will be available for trading with other books. No monetary transactions will be involved for trade-only listings.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBookPage;