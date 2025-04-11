import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

interface SocketContextType {
  socket: typeof io.Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<typeof io.Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<typeof io.Socket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Not authenticated');
      return;
    }

    // Only create a new socket if one doesn't exist
    if (!socketRef.current) {
      console.log('Creating socket connection');
      const newSocket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        if (mountedRef.current) {
          console.log('Socket connected');
          setIsConnected(true);
        }
      });

      newSocket.on('disconnect', () => {
        if (mountedRef.current) {
          console.log('Socket disconnected');
          setIsConnected(false);
        }
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      mountedRef.current = false;
      // Only disconnect if the component is unmounting
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}; 