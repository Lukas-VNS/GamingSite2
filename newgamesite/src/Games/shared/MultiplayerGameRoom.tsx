import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

interface MultiplayerGameRoomProps {
  gameType: 'tictactoe' | 'connect4';
  title: string;
  children: React.ReactNode;
  onMove?: (position: number) => void;
  gameStatus: {
    isActive: boolean;
    isEnded: boolean;
    isDraw?: boolean;
    winner?: string | null;
    currentPlayer?: string;
    player1?: {
      id: string;
      username: string;
      timeRemaining: number;
    };
    player2?: {
      id: string;
      username: string;
      timeRemaining: number;
    };
  };
}

const MultiplayerGameRoom: React.FC<MultiplayerGameRoomProps> = ({
  gameType,
  title,
  children,
  onMove,
  gameStatus
}) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Get the current user's ID from the token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    }
  }, []);

  const handlePlayAgain = () => {
    navigate(`/${gameType}/multiplayerqueue`);
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Error</h1>
          <p className="text-xl mb-8">{error}</p>
          <button
            onClick={handleReturnHome}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

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
          {/* Player Names and Timers */}
          {gameStatus.player1 && gameStatus.player2 && (
            <div className="flex justify-between items-center mb-4">
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player1.id ? 'bg-blue-500/10' : ''}`}>
                <div className="text-sm text-gray-400">Player 1</div>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player1.id ? 'text-blue-400' : 'text-gray-300'} ${gameStatus.player1.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.currentPlayer === gameStatus.player1.id ? 'You: ' : ''}{gameStatus.player1.username}
                </div>
                <div className={`text-lg mt-2 ${gameStatus.currentPlayer === gameStatus.player1.id ? 'text-blue-400' : 'text-gray-400'}`}>
                  {formatTime(gameStatus.player1.timeRemaining)}
                </div>
              </div>
              <div className="mx-4 text-gray-500">vs</div>
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player2.id ? 'bg-purple-500/10' : ''}`}>
                <div className="text-sm text-gray-400">Player 2</div>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player2.id ? 'text-purple-400' : 'text-gray-300'} ${gameStatus.player2.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.currentPlayer === gameStatus.player2.id ? 'You: ' : ''}{gameStatus.player2.username}
                </div>
                <div className={`text-lg mt-2 ${gameStatus.currentPlayer === gameStatus.player2.id ? 'text-purple-400' : 'text-gray-400'}`}>
                  {formatTime(gameStatus.player2.timeRemaining)}
                </div>
              </div>
            </div>
          )}

          {/* Turn Status Message */}
          {gameStatus.isActive && gameStatus.currentPlayer && (
            <div className="text-xl font-semibold mb-6">
              {gameStatus.currentPlayer === currentUserId ? 'Your turn' : "Opponent's turn"}
            </div>
          )}

          {/* Game Board */}
          <div className="mb-6">
            {children}
          </div>

          {/* End game section */}
          {gameStatus.isEnded && (
            <div className="space-y-4">
              <div className={`text-2xl font-bold mb-4 ${
                gameStatus.isDraw ? 'text-white' :
                gameStatus.winner === currentUserId ? 'text-green-400' : 'text-red-400'
              }`}>
                {gameStatus.isDraw ? "It's a draw! 🤝" :
                 gameStatus.winner === currentUserId ? 'You won! 🎉' : 'You lost! 😔'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePlayAgain}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-md transition-colors text-lg font-semibold"
                >
                  Find New Game
                </button>
                <button
                  onClick={handleReturnHome}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-md transition-colors text-lg font-semibold"
                >
                  Return Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerGameRoom; 