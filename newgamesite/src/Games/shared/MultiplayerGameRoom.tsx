import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

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
  boardState?: any; // This will be game-specific
}

interface MultiplayerGameRoomProps {
  gameType: 'tictactoe' | 'connect4';
  title: string;
  children: React.ReactElement<{
    boardState?: any;
    onMove?: (position: number) => void;
    isActive?: boolean;
    currentPlayer?: string;
    currentUserId?: string;
  }>;
  onMove?: (position: number) => void;
}

export const MultiplayerGameRoom: React.FC<MultiplayerGameRoomProps> = ({
  gameType,
  title,
  children,
  onMove
}) => {
  const { gameId } = useParams<{ gameId: string }>();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { socket, isConnected } = useSocket();
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isActive: false,
    isEnded: false,
    player1: {
      id: '',
      username: 'Waiting for player...',
    },
    player2: {
      id: '',
      username: 'Waiting for player...',
    }
  });

  // Get the current user's ID from the token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    }
  }, []);

  // Set up game state management
  useEffect(() => {
    const numericGameId = parseInt(gameId || '');
    
    if (isNaN(numericGameId)) {
      console.error('Invalid game ID');
      return;
    }

    if (!socket) {
      console.log('Socket not initialized yet');
      return;
    }

    if (!isConnected) {
      console.log('Waiting for socket connection...');
      return;
    }

    console.log('Socket connected, joining game:', numericGameId);
    socket.emit('joinGame', {
      gameId: numericGameId,
      gameType
    });

    const handleGameState = (data: any) => {
      console.log('Received game state:', data);
      console.log('Current user ID:', currentUserId);
      console.log('Next player:', data.nextPlayer);
      console.log('Player 1 ID:', data.player1Id);
      console.log('Player 2 ID:', data.player2Id);
      console.log('Player 1 username:', data.player1?.username);
      console.log('Player 2 username:', data.player2?.username);
      
      const isPlayer1 = data.player1Id === currentUserId;
      const isPlayer2 = data.player2Id === currentUserId;
      const isCurrentPlayer = (data.nextPlayer === 1 && isPlayer1) || (data.nextPlayer === 2 && isPlayer2);
      
      console.log('Is current player:', isCurrentPlayer);
      
      setGameStatus({
        isActive: data.state === 'ACTIVE',
        isEnded: data.state === 'PLAYER1_WIN' || data.state === 'PLAYER2_WIN' || data.state === 'DRAW',
        isDraw: data.state === 'DRAW',
        winner: data.state === 'PLAYER1_WIN' ? data.player1Id : 
                data.state === 'PLAYER2_WIN' ? data.player2Id : null,
        currentPlayer: data.nextPlayer === 1 ? data.player1Id : data.player2Id,
        player1: data.player1 ? {
          id: data.player1Id,
          username: data.player1.username
        } : {
          id: data.player1Id,
          username: 'Waiting for player...'
        },
        player2: data.player2 ? {
          id: data.player2Id,
          username: data.player2.username
        } : {
          id: data.player2Id,
          username: 'Waiting for player...'
        },
        boardState: data.boardState
      });
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
    };

    socket.on('game-state', handleGameState);
    socket.on('error', handleError);

    return () => {
      socket.off('game-state', handleGameState);
      socket.off('error', handleError);
    };
  }, [gameId, gameType, currentUserId, socket, isConnected]);

  const handleMove = (position: number) => {
    if (!socket || !gameStatus.isActive) {
      console.log('Cannot make move: Game not active or socket not connected');
      return;
    }
    
    if (gameStatus.currentPlayer !== currentUserId) {
      console.log('Cannot make move: Not your turn');
      console.log('Current player:', gameStatus.currentPlayer);
      console.log('Your ID:', currentUserId);
      return;
    }

    console.log('Making move at position:', position);
    socket.emit('makeMove', {
      gameId: parseInt(gameId || ''),
      position
    });
  };

  // Pass the game state and move handler to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        boardState: gameStatus.boardState,
        onMove: handleMove,
        isActive: gameStatus.isActive,
        currentPlayer: gameStatus.currentPlayer,
        currentUserId
      });
    }
    return child;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {title}
        </h1>

        <div className="bg-gray-700 rounded-lg p-8 shadow-xl max-w-md mx-auto">
          {/* Player Names and Timers */}
          {gameStatus.player1 && gameStatus.player2 && (
            <div className="flex justify-between items-center mb-4">
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player1.id ? 'bg-blue-500/10' : ''}`}>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player1.id ? 'text-blue-400' : 'text-gray-300'} ${gameStatus.player1.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.player1.id === currentUserId ? 'You: ' : ''}{gameStatus.player1.username}
                </div>
              </div>
              <div className="mx-4 text-gray-500">vs</div>
              <div className={`text-center flex-1 p-3 rounded-lg ${gameStatus.currentPlayer === gameStatus.player2.id ? 'bg-purple-500/10' : ''}`}>
                <div className={`font-bold ${gameStatus.currentPlayer === gameStatus.player2.id ? 'text-purple-400' : 'text-gray-300'} ${gameStatus.player2.id === currentUserId ? 'underline' : ''}`}>
                  {gameStatus.player2.id === currentUserId ? 'You: ' : ''}{gameStatus.player2.username}
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
            {childrenWithProps}
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

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default MultiplayerGameRoom; 