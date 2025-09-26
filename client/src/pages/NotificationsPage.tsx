import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Notification {
  _id: string;
  type: 'bid' | 'auction_end' | 'trade' | 'offer' | 'purchase' | 'sale';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, read: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bid': return '$';
      case 'auction_end': return 'Bid';
      case 'trade': return 'Trade';
      case 'offer': return '$';
      case 'purchase': return 'Buy';
      case 'sale': return 'Sold';
      default: return '!';
    }
  };

  const filteredNotifications = notifications.filter(notif => 
    filter === 'all' || (filter === 'unread' && !notif.read)
  );

  const unreadCount = notifications.filter(notif => !notif.read).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
        <div className="tabs-container">
          <button 
            className={`tab-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`tab-button ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          
          {unreadCount > 0 && (
            <button className="btn btn-accent btn-small" onClick={markAllAsRead}>
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty-state">
          {filter === 'unread' ? (
            <div>
              <h3>You're all caught up!</h3>
              <p>No unread notifications.</p>
            </div>
          ) : (
            <div>
              <h3>No notifications yet</h3>
              <p>When you start buying, selling, or trading books, you'll see notifications here.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="list-container">
          {filteredNotifications.map(notification => (
            <div 
              key={notification._id} 
              className={`list-item ${!notification.read ? 'unread' : ''}`}
              style={{ 
                borderLeft: !notification.read ? '4px solid var(--primary-color)' : '4px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                    {notification.title}
                  </h3>
                  <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)' }}>
                    {notification.message}
                  </p>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {!notification.read && (
                    <button 
                      className="btn btn-success btn-small"
                      onClick={() => markAsRead(notification._id)}
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;