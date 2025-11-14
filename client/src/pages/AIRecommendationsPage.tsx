import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { MessageCircle, Send, BookOpen, Sparkles, X, Settings } from 'lucide-react';
import './AIRecommendationsPage.css';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:5000');

interface Recommendation {
  title: string;
  author: string;
  genre: string;
  reason: string;
  availableInMarketplace: boolean;
  marketplaceBooks: Array<{
    id: string;
    title: string;
    author: string;
    condition: string;
    fixedPrice?: number;
    currentBid?: number;
    listingTypes: any;
    pdfLink?: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UserPreferences {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  preferredBookTypes: string[];
  priceRange: { min: number; max: number };
}

const AIRecommendationsPage: React.FC = () => {
  const { } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    favoriteGenres: [],
    favoriteAuthors: [],
    preferredBookTypes: [],
    priceRange: { min: 0, max: 1000 }
  });
  const [tempPreferences, setTempPreferences] = useState<UserPreferences>(preferences);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    loadPreferences();
    loadInitialRecommendations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ai/chat/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setChatMessages(response.data.chatHistory);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ai/preferences`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPreferences(response.data);
      setTempPreferences(response.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const loadInitialRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/ai/recommendations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/ai/chat`,
        { message: inputMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      if (response.data.recommendations && response.data.recommendations.length > 0) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      await axios.put(
        `${API_URL}/api/ai/preferences`,
        {
          genres: tempPreferences.favoriteGenres,
          authors: tempPreferences.favoriteAuthors,
          types: tempPreferences.preferredBookTypes,
          priceRange: tempPreferences.priceRange
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPreferences(tempPreferences);
      setShowPreferences(false);
      loadInitialRecommendations();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addGenre = (genre: string) => {
    if (genre && !tempPreferences.favoriteGenres.includes(genre)) {
      setTempPreferences({
        ...tempPreferences,
        favoriteGenres: [...tempPreferences.favoriteGenres, genre]
      });
    }
  };

  const removeGenre = (genre: string) => {
    setTempPreferences({
      ...tempPreferences,
      favoriteGenres: tempPreferences.favoriteGenres.filter(g => g !== genre)
    });
  };

  const addAuthor = (author: string) => {
    if (author && !tempPreferences.favoriteAuthors.includes(author)) {
      setTempPreferences({
        ...tempPreferences,
        favoriteAuthors: [...tempPreferences.favoriteAuthors, author]
      });
    }
  };

  const removeAuthor = (author: string) => {
    setTempPreferences({
      ...tempPreferences,
      favoriteAuthors: tempPreferences.favoriteAuthors.filter(a => a !== author)
    });
  };

  return (
    <div className="ai-recommendations-page">
      <div className="ai-header">
        <div className="ai-header-content">
          <Sparkles className="ai-icon" />
          <div>
            <h1>AI Book Recommendations</h1>
            <p>Chat with our AI to discover your next favorite book</p>
          </div>
        </div>
        <button className="preferences-btn" onClick={() => setShowPreferences(true)}>
          <Settings size={20} />
          Preferences
        </button>
      </div>

      <div className="ai-content">
        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div className="welcome-message">
                <MessageCircle size={48} />
                <h3>Welcome to AI Book Recommendations!</h3>
                <p>Tell me about your reading preferences, favorite genres, or authors you love.</p>
                <div className="quick-prompts">
                  <button onClick={() => setInputMessage("I love mystery novels")}>
                    I love mystery novels
                  </button>
                  <button onClick={() => setInputMessage("Recommend sci-fi books")}>
                    Recommend sci-fi books
                  </button>
                  <button onClick={() => setInputMessage("Books like Harry Potter")}>
                    Books like Harry Potter
                  </button>
                </div>
              </div>
            )}

            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                <div className="message-content">
                  {msg.role === 'assistant' && <Sparkles size={16} className="ai-badge" />}
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about books..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !inputMessage.trim()}>
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="recommendations-section">
          <h2>
            <BookOpen size={24} />
            Recommended Books
          </h2>

          {recommendations.length === 0 && !loading && (
            <p className="no-recommendations">
              Start chatting to get personalized book recommendations!
            </p>
          )}

          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className="recommendation-card">
                <div className="rec-header">
                  <h3>{rec.title}</h3>
                  {rec.availableInMarketplace && (
                    <span className="available-badge">Available</span>
                  )}
                </div>
                <p className="rec-author">by {rec.author}</p>
                <p className="rec-genre">{rec.genre}</p>
                {rec.reason && <p className="rec-reason">{rec.reason}</p>}

                {rec.availableInMarketplace && rec.marketplaceBooks.length > 0 && (
                  <div className="marketplace-books">
                    <h4>Available in Marketplace:</h4>
                    {rec.marketplaceBooks.map((book) => (
                      <div key={book.id} className="marketplace-book">
                        <div className="book-info">
                          <p className="book-title">{book.title}</p>
                          <p className="book-condition">Condition: {book.condition}</p>
                          {book.fixedPrice && (
                            <p className="book-price">Price: ${book.fixedPrice}</p>
                          )}
                          {book.currentBid && (
                            <p className="book-price">Current Bid: ${book.currentBid}</p>
                          )}
                          {book.pdfLink && (
                            <span className="pdf-badge">PDF Available</span>
                          )}
                        </div>
                        <a href={`/books/${book.id}`} className="view-book-btn">
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="modal-overlay" onClick={() => setShowPreferences(false)}>
          <div className="preferences-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your Preferences</h2>
              <button onClick={() => setShowPreferences(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-content">
              <div className="preference-section">
                <label>Favorite Genres</label>
                <div className="tags-container">
                  {tempPreferences.favoriteGenres.map((genre) => (
                    <span key={genre} className="tag">
                      {genre}
                      <button onClick={() => removeGenre(genre)}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add genre (press Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addGenre((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>

              <div className="preference-section">
                <label>Favorite Authors</label>
                <div className="tags-container">
                  {tempPreferences.favoriteAuthors.map((author) => (
                    <span key={author} className="tag">
                      {author}
                      <button onClick={() => removeAuthor(author)}>×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add author (press Enter)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addAuthor((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>

              <div className="preference-section">
                <label>Price Range</label>
                <div className="price-range">
                  <input
                    type="number"
                    value={tempPreferences.priceRange.min}
                    onChange={(e) => setTempPreferences({
                      ...tempPreferences,
                      priceRange: { ...tempPreferences.priceRange, min: Number(e.target.value) }
                    })}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={tempPreferences.priceRange.max}
                    onChange={(e) => setTempPreferences({
                      ...tempPreferences,
                      priceRange: { ...tempPreferences.priceRange, max: Number(e.target.value) }
                    })}
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowPreferences(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={savePreferences}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationsPage;
