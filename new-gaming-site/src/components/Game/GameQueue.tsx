import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socketService';

interface GameQueueProps {
  gameType: 'tic-tac-toe' | 'connect4';
  onQueued?: (data: { message: string }) => void;
  onPlayerAssigned?: (data: any) => void;
  onError?: (data: { message: string }) => void;
  gamePath: string;
  returnPath: string;
}

const GameQueue: React.FC<GameQueueProps> = ({
  gameType,
  onQueued,
  onPlayerAssigned,
  onError,
  gamePath,
  returnPath
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
      onQueued?.(data);
    };

    const playerAssignedHandler = (data: any) => {
      console.log(`[${gameType.toUpperCase()}] Player assigned:`, data);
      setIsInQueue(false);
      onPlayerAssigned?.(data);
      
      // Use the correct path format for navigation
      const gameId = data.gameState.id;
      navigate(`/${gameType}/multiplayer/game/${gameId}`);
    };

    const errorHandler = (data: { message: string }) => {
      console.error(`[${gameType.toUpperCase()}] Socket error:`, data);
      setError(data.message || 'An error occurred');
      onError?.(data);
    };

    const disconnectHandler = () => {
      console.log(`[${gameType.toUpperCase()}] Disconnected from server`);
      setIsConnected(false);
      setIsInQueue(false);
    };

    // Add event listeners based on game type
    if (gameType === 'connect4') {
      socketService.onConnect4Queued(queuedHandler);
      socketService.onConnect4PlayerAssigned(playerAssignedHandler);
      socketService.onConnect4Error(errorHandler);
      socketService.onConnect4Disconnect(disconnectHandler);
    } else {
      socketService.onTicTacToeQueued(queuedHandler);
      socketService.onTicTacToePlayerAssigned(playerAssignedHandler);
      socketService.onTicTacToeError(errorHandler);
      socketService.onTicTacToeDisconnect(disconnectHandler);
    }

    // Cleanup function
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [navigate, gameType, onQueued, onPlayerAssigned, onError]);

  const handleJoinQueue = () => {
    if (!isConnected) {
      setError('Not connected to server. Please try again.');
      return;
    }

    setError('');
    setIsInQueue(true);
    if (gameType === 'connect4') {
      socketService.joinConnect4Game();
    } else {
      socketService.joinTicTacToeGame();
    }
  };

  const handleCancelQueue = () => {
    setIsInQueue(false);
    socketService.disconnect();
    navigate(returnPath);
  };

  return (
    <div className="text-center">
      {error && (
        <div className="bg-red-500 text-white p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {isInQueue ? (
        <div>
          <div className="animate-pulse mb-6">
            <p className="text-xl mb-4">Searching for opponent...</p>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <button
            onClick={handleCancelQueue}
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded-md transition-colors"
          >
            Cancel Search
          </button>
        </div>
      ) : (
        <button
          onClick={handleJoinQueue}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-md transition-colors"
          disabled={!isConnected}
        >
          {isConnected ? 'Join Queue' : 'Connecting...'}
        </button>
      )}
    </div>
  );
};

export default GameQueue; 