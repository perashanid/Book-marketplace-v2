import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';
import api from '../utils/api';
import './ProfilePage.css';

interface UserProfile {
  name: string;
  email: string;
  joinedDate: string;
  bio?: string;
  location?: string;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/profile');
      setProfile(response.data);
      setEditedProfile(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');
      await api.put('/api/auth/profile', editedProfile);
      setProfile({ ...profile, ...editedProfile } as UserProfile);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="error">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={64} />
          </div>
          <h1>{profile.name}</h1>
          {!isEditing && (
            <button 
              className="edit-button"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="profile-content">
          <div className="profile-field">
            <label>
              <Mail size={18} />
              Email
            </label>
            <div className="field-value">{profile.email}</div>
          </div>

          <div className="profile-field">
            <label>
              <Calendar size={18} />
              Member Since
            </label>
            <div className="field-value">
              {new Date(profile.joinedDate).toLocaleDateString()}
            </div>
          </div>

          <div className="profile-field">
            <label>Bio</label>
            {isEditing ? (
              <textarea
                value={editedProfile.bio || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            ) : (
              <div className="field-value">{profile.bio || 'No bio yet'}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Location</label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.location || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                placeholder="Your location"
              />
            ) : (
              <div className="field-value">{profile.location || 'Not specified'}</div>
            )}
          </div>

          {isEditing && (
            <div className="profile-actions">
              <button className="save-button" onClick={handleSave}>
                <Save size={16} />
                Save Changes
              </button>
              <button 
                className="cancel-button" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedProfile(profile);
                  setError('');
                }}
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
