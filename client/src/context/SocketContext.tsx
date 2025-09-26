import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinAuctionRoom: (bookId: string) => void;
  leaveAuctionRoom: (bookId: string) => void;
  joinUserRoom: (userId: string) => void;
  leaveUserRoom: (userId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      // Initialize socket connection
      const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Disconnect socket if no token
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [token]);

  const joinAuctionRoom = (bookId: string) => {
    if (socket && isConnected) {
      socket.emit('join_auction', bookId);
    }
  };

  const leaveAuctionRoom = (bookId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_auction', bookId);
    }
  };

  const joinUserRoom = (userId: string) => {
    if (socket && isConnected) {
      socket.emit('join_user_room', userId);
    }
  };

  const leaveUserRoom = (userId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_user_room', userId);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinAuctionRoom,
    leaveAuctionRoom,
    joinUserRoom,
    leaveUserRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};