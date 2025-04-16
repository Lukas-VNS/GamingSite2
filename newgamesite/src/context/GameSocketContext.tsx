import React, { createContext, useContext, useEffect, useState } from 'react';
import { Manager } from 'socket.io-client';
import io from 'socket.io-client';

type Socket = ReturnType<InstanceType<typeof Manager>['socket']>;

interface GameSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const GameSocketContext = createContext<GameSocketContextType>({
  socket: null,
  isConnected: false
});

export const useGameSocket = () => useContext(GameSocketContext);

export const GameSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      console.log('No token available for socket connection');
      return;
    }

    console.log('Creating new socket connection in GameSocketContext');
    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected from GameSocketContext:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected from GameSocketContext:', newSocket.id);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('Socket connection error from GameSocketContext:', error);
      setIsConnected(false);
    });

    return () => {
      console.log('Cleaning up socket in GameSocketContext:', newSocket.id);
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <GameSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </GameSocketContext.Provider>
  );
}; 