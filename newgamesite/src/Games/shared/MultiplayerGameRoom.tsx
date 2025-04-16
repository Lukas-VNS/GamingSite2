import React, { useEffect, useState } from 'react';

interface GameStatus {
  isActive: boolean;
  isEnded: boolean;
  isDraw?: boolean;
  winner?: string | null;
  currentPlayer?: string;
  player1?: {
    id: string;
    username: string;
  };
  player2?: {
    id: string;
    username: string;
  };
  boardState?: any;
  player1Time: number;
  player2Time: number;
}

interface MultiplayerGameRoomProps {
  gameType: string;
  title: string;
  gameStatus: GameStatus;
  currentUserId: string;
  children: React.ReactNode;
  player1Symbol: string;
  player2Symbol: string;
}

const formatTime = (seconds: number, isGameEnded: boolean): string => {
  // If game is ended and time is very close to 0, show 0:00
  if (isGameEnded && seconds < 1) {
    return '0:00';
  }
  const roundedSeconds = Math.floor(seconds); // Use floor instead of round to be more conservative
  const mins = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MultiplayerGameRoom: React.FC<MultiplayerGameRoomProps> = ({
  gameType,
  title,
  gameStatus,
  currentUserId,
  children,
  player1Symbol,
  player2Symbol
}) => {
  const [player1Time, setPlayer1Time] = useState(gameStatus.player1Time);
  const [player2Time, setPlayer2Time] = useState(gameStatus.player2Time);

  useEffect(() => {
    setPlayer1Time(gameStatus.player1Time);
    setPlayer2Time(gameStatus.player2Time);
  }, [gameStatus.player1Time, gameStatus.player2Time]);

  useEffect(() => {
    if (!gameStatus.isActive || gameStatus.isEnded) return;

    const timer = setInterval(() => {
      if (gameStatus.currentPlayer === gameStatus.player1?.id) {
        setPlayer1Time(prev => Math.max(0, prev - 1));
      } else if (gameStatus.currentPlayer === gameStatus.player2?.id) {
        setPlayer2Time(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus.isActive, gameStatus.isEnded, gameStatus.currentPlayer, gameStatus.player1?.id, gameStatus.player2?.id]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {title}
        </h1>

        <div className="bg-gray-700 rounded-lg p-8 shadow-xl max-w-md mx-auto">
          {/* Player Names and Timers */}
          {gameStatus.player1 && gameStatus.player2 && (
            <div className="flex justify-between items-center mb-4">
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player1.id ? 'bg-blue-500/10' : ''}`}>
                <div className="text-2xl font-bold mb-2">{player1Symbol}</div>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player1.id ? 'text-blue-400' : 'text-gray-300'} ${gameStatus.player1.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.player1.id === currentUserId ? 'You: ' : ''}{gameStatus.player1.username}
                </div>
                <div className={`text-lg mt-2 ${player1Time < 10 ? 'text-red-500' : 'text-white'}`}>
                  {formatTime(player1Time, gameStatus.isEnded)}
                </div>
              </div>
              <div className="mx-4 text-gray-500">vs</div>
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player2.id ? 'bg-purple-500/10' : ''}`}>
                <div className="text-2xl font-bold mb-2">{player2Symbol}</div>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player2.id ? 'text-purple-400' : 'text-gray-300'} ${gameStatus.player2.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.player2.id === currentUserId ? 'You: ' : ''}{gameStatus.player2.username}
                </div>
                <div className={`text-lg mt-2 ${player2Time < 10 ? 'text-red-500' : 'text-white'}`}>
                  {formatTime(player2Time, gameStatus.isEnded)}
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
          <div>
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
                  onClick={() => window.location.href = `/${gameType}/multiplayerqueue`}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-md transition-colors text-lg font-semibold"
                >
                  Find New Game
                </button>
                <button
                  onClick={() => window.location.href = '/'}
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