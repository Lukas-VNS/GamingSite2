import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const MultiplayerGamePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isInQueue, setIsInQueue] = useState(false);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Get the token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      navigate('/login');
      return;
    }

    // Initialize socket connection
    const newSocket = io(API_BASE_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setError(''); // Clear any previous connection errors
      
      // Auto-join queue if coming from a finished game
      if (location.state?.autoJoinQueue) {
        setIsInQueue(true);
        newSocket.emit('join_queue');
        console.log('Auto-joining queue...');
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server');
      setIsInQueue(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setError('Connection lost. Please try again.');
      setIsInQueue(false);
    });

    // Listen for queue events
    newSocket.on('queue_joined', () => {
      console.log('Successfully joined queue');
      setError('');
    });

    newSocket.on('queue_error', (message: string) => {
      console.error('Queue error:', message);
      setError(message);
      setIsInQueue(false);
    });

    // Listen for game created event
    newSocket.on('game_created', (gameId: string) => {
      console.log('Game created, navigating to game room:', gameId);
      setIsInQueue(false);
      navigate(`/tictactoe/multiplayer/game/${gameId}`);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        if (isInQueue) {
          newSocket.emit('leave_queue');
        }
        newSocket.disconnect();
      }
    };
  }, [navigate, location.state]);

  const handleJoinQueue = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setError(''); // Clear any previous errors
    setIsInQueue(true);
    socket.emit('join_queue');
    console.log('Joining queue...');
  };

  const handleCancelQueue = () => {
    if (!socket) return;
    
    socket.emit('leave_queue');
    setIsInQueue(false);
    console.log('Left queue');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Multiplayer Tic Tac Toe
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-md mb-8">
            {error}
          </div>
        )}

        <div className="bg-gray-700 rounded-lg p-8 shadow-xl max-w-md mx-auto">
          {!isInQueue ? (
            <div>
              <p className="text-gray-300 mb-6">
                Click Ready to join the queue and find an opponent!
              </p>
              <button
                onClick={handleJoinQueue}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md transition-colors text-lg font-semibold"
              >
                Ready
              </button>
            </div>
          ) : (
            <div>
              <div className="animate-pulse mb-6">
                <p className="text-xl mb-4">Searching for opponent...</p>
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <button
                onClick={handleCancelQueue}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-md transition-colors text-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGamePage; 