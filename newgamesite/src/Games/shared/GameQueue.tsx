import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

interface GameQueueProps {
  gameType: 'tictactoe' | 'connect4';
  gamePath: string;
  returnPath: string;
  title: string;
}

interface QueueStatus {
  position: number;
  totalPlayers: number;
}

const GameQueue: React.FC<GameQueueProps> = ({
  gameType,
  gamePath,
  returnPath,
  title
}) => {
  const navigate = useNavigate();
  const [isInQueue, setIsInQueue] = useState(false);
  const [error, setError] = useState<string>('');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080', {
      auth: {
        token
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to queue server');
    });

    newSocket.on('queue-update', (status: QueueStatus) => {
      setQueueStatus(status);
    });

    newSocket.on('game-found', (data: { gameId: string; opponent: string }) => {
      navigate(`${gamePath}/${data.gameId}`);
    });

    newSocket.on('error', (error: { message: string }) => {
      setError(error.message);
      setIsInQueue(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [gamePath, navigate]);

  const handleJoinQueue = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setError('');
    setIsInQueue(true);
    socket.emit('join-queue', { gameType, token });
  };

  const handleCancelQueue = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    socket.emit('leave-queue', { gameType });
    setIsInQueue(false);
    setQueueStatus(null);
    navigate(returnPath);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {title}
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
                Click Ready to find an opponent!
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
                {queueStatus && (
                  <p className="mt-4 text-gray-300">
                    Position in queue: {queueStatus.position} of {queueStatus.totalPlayers}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancelQueue}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-md transition-colors text-lg font-semibold"
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameQueue; 