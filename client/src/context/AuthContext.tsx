import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../utils/api';

interface User {
  _id: string;
  username: string;
  email: string;
  balance: number;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // API configuration is handled in utils/api.ts

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/api/auth/verify');
          if (response.data.success) {
            setUser(response.data.data.user);
          } else {
            // Token is invalid
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data;
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the server is running.');
      }
      
      const message = error.response?.data?.error?.message || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data;
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
      } else {
        throw new Error(response.data.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the server is running.');
      }
      
      // Handle validation errors
      if (error.response?.data?.error?.details) {
        const validationErrors = error.response.data.error.details;
        const errorMessage = validationErrors.map((err: any) => err.message).join(', ');
        throw new Error(errorMessage);
      }
      
      const message = error.response?.data?.error?.message || error.message || 'Registration failed';
      throw new Error(message);
    }
  };

  const googleLogin = async (credential: string) => {
    try {
      const response = await api.post('/api/auth/google', { credential });
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data;
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
      } else {
        throw new Error(response.data.error?.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to server. Please make sure the server is running.');
      }
      
      const message = error.response?.data?.error?.message || error.message || 'Google login failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    googleLogin,
    logout,
    loading,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};