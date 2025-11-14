import React from 'react';
import { Mail, Github, Linkedin, MessageCircle, User } from 'lucide-react';
import './ContactPage.css';

const ContactPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Contact Us</h1>
          <p className="card-subtitle">Get in touch with the developer</p>
        </div>

        <div className="contact-content">
          <div className="contact-intro">
            <div className="contact-avatar">
              <User size={64} />
            </div>
            <h2>Shanid Sajjatuz</h2>
            <p className="contact-role">Full Stack Developer</p>
            <p className="contact-description">
              Creator of Bookverse - A modern platform for buying, selling, and trading books. 
              Feel free to reach out for any questions, feedback, or collaboration opportunities.
            </p>
          </div>

          <div className="contact-methods">
            <div className="contact-method">
              <div className="contact-icon">
                <Mail size={24} />
              </div>
              <div className="contact-info">
                <h3>Email</h3>
                <a href="mailto:shanidsajjatuz@gmail.com" className="contact-link">
                  shanidsajjatuz@gmail.com
                </a>
                <p>Best way to reach me for business inquiries or support</p>
              </div>
            </div>

            <div className="contact-method">
              <div className="contact-icon">
                <Github size={24} />
              </div>
              <div className="contact-info">
                <h3>GitHub</h3>
                <a 
                  href="https://github.com/perashanid" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="contact-link"
                >
                  github.com/perashanid
                </a>
                <p>Check out my projects and contributions</p>
              </div>
            </div>

            <div className="contact-method">
              <div className="contact-icon">
                <Linkedin size={24} />
              </div>
              <div className="contact-info">
                <h3>LinkedIn</h3>
                <a 
                  href="https://www.linkedin.com/in/shanid-sajjatuz-16154726b/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="contact-link"
                >
                  linkedin.com/in/shanid-sajjatuz
                </a>
                <p>Connect with me professionally</p>
              </div>
            </div>
          </div>

          <div className="contact-form-section">
            <div className="contact-form-header">
              <MessageCircle size={24} />
              <h3>Send a Message</h3>
            </div>
            <p className="contact-form-description">
              Have a question about Bookverse or want to provide feedback? 
              Send me an email using the link above or connect with me on social media.
            </p>
            
            <div className="contact-features">
              <div className="feature-item">
                <h4>🚀 Feature Requests</h4>
                <p>Got an idea to improve Bookverse? I'd love to hear it!</p>
              </div>
              <div className="feature-item">
                <h4>🐛 Bug Reports</h4>
                <p>Found an issue? Let me know so I can fix it quickly.</p>
              </div>
              <div className="feature-item">
                <h4>💼 Business Inquiries</h4>
                <p>Interested in collaboration or have a project in mind?</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;