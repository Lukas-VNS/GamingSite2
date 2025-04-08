import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../../../services/socketService';

interface GameQueueProps {
  gameType: 'tictactoe' | 'connect4';
  gamePath: string;
  returnPath: string;
  title: string;
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();
    setIsConnected(true);

    // Set up socket event listeners based on game type
    const queuedHandler = (data: { message: string }) => {
      console.log(`[${gameType.toUpperCase()}] Queued:`, data);
      setIsInQueue(true);
    };

    const playerAssignedHandler = (data: any) => {
      console.log(`[${gameType.toUpperCase()}] Player assigned:`, data);
      setIsInQueue(false);
      
      const gameId = data.gameId;
      navigate(`/${gameType}/multiplayer/game/${gameId}`);
    };

    const errorHandler = (data: { message: string }) => {
      console.error(`[${gameType.toUpperCase()}] Socket error:`, data);
      setError(data.message || 'An error occurred');
      setIsInQueue(false);
    };

    const disconnectHandler = () => {
      console.log(`[${gameType.toUpperCase()}] Disconnected from server`);
      setIsConnected(false);
      setIsInQueue(false);
    };

    // Add event listeners
    socketService.onQueued(queuedHandler);
    socketService.onGameCreated(playerAssignedHandler);
    socketService.onError(errorHandler);
    socketService.onDisconnect(disconnectHandler);

    // Cleanup function
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [navigate, gameType]);

  const handleJoinQueue = () => {
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    setError('');
    setIsInQueue(true);
    if (gameType === 'connect4') {
      socketService.joinConnect4Game();
    } else if (gameType === 'tictactoe') {
      socketService.joinTicTacToeGame();
    } else {
      console.error('Invalid game type:', gameType);
    }
  };

  const handleCancelQueue = () => {
    setIsInQueue(false);
    socketService.disconnect();
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
                Click Ready to find an opponent! TEST TEST TEST
              </p>
              <button
                onClick={handleJoinQueue}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md transition-colors text-lg font-semibold"
                disabled={!isConnected}
              >
                {isConnected ? 'Ready' : 'Connecting...'}
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