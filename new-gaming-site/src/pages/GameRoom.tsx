import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import API_ENDPOINTS from '../config/api';

interface GameState {
  id: number;
  squares: Array<'X' | 'O' | null>;
  nextPlayer: 'X' | 'O';
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  playerX: {
    id: string;
    username: string;
  } | null;
  playerO: {
    id: string;
    username: string;
  } | null;
  readyStatus?: {
    X: boolean;
    O: boolean;
  };
  players?: {
    X: string | null;
    O: string | null;
  };
}

interface PlayerAssignedData {
  player: 'X' | 'O';
  playersConnected: number;
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const GameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [error, setError] = useState<string>('');
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);

  useEffect(() => {
    const numericGameId = parseInt(gameId || '');
    
    if (isNaN(numericGameId)) {
      setError('Invalid game ID');
      return;
    }

    const newSocket = io(API_BASE_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to game room with socket ID:', newSocket.id);
      console.log('Joining game:', numericGameId);
      newSocket.emit('join_game', numericGameId);

      if (location.state?.autoJoinQueue) {
        setIsInQueue(true);
        newSocket.emit('join_queue');
        console.log('Auto-joining queue...');
      }
    });

    newSocket.on('player_assigned', (data: PlayerAssignedData) => {
      console.log('Player assigned:', data);
      setPlayerSymbol(data.player);
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          gameStatus: data.gameStatus,
          readyStatus: data.readyStatus,
          winner: data.winner
        };
      });
    });

    newSocket.on('game_update', (updatedGame: GameState) => {
      console.log('Game updated:', updatedGame);
      setGame(updatedGame);
    });

    setSocket(newSocket);

    // Load initial game state
    const loadGame = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.games.get(numericGameId), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load game');
        }

        const gameData = await response.json();
        setGame(gameData);
      } catch (err) {
        console.error('Error loading game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
      }
    };

    loadGame();

    return () => {
      if (newSocket) {
        console.log('Disconnecting from game room');
        newSocket.disconnect();
      }
    };
  }, [gameId, location.state]);

  const handleMove = async (index: number) => {
    if (!socket || !game || !playerSymbol || game.gameStatus !== 'active') {
      return;
    }

    // Check if it's the player's turn
    if (game.nextPlayer !== playerSymbol) {
      setError("It's not your turn!");
      return;
    }

    // Check if the square is already taken
    if (game.squares[index] !== null) {
      setError('That square is already taken!');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    // Emit the move event through the socket
    socket.emit('make_move', {
      gameId: gameId,
      position: index,
      player: playerSymbol
    });
  };

  const handlePlayAgain = () => {
    // Navigate to multiplayer page and auto-join queue
    navigate('/tictactoe/multiplayer', { state: { autoJoinQueue: true } });
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const getStatusMessage = () => {
    if (!game) return '';
    
    if (game.gameStatus === 'waiting') {
      return 'Waiting for opponent to join...';
    }
    
    if (game.gameStatus === 'active') {
      if (game.nextPlayer === playerSymbol) {
        return 'Your turn';
      } else {
        return "Opponent's turn";
      }
    }
    
    if (game.gameStatus === 'ended') {
      if (game.winner === playerSymbol) {
        return 'You won! 🎉';
      } else {
        return 'You lost! 😔';
      }
    }
    
    if (game.gameStatus === 'draw') {
      return "It's a draw! 🤝";
    }
    
    return '';
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-8">Loading game...</h1>
          {error && (
            <div className="bg-red-500 text-white p-4 rounded-md mb-8">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Tic Tac Toe
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-md mb-8">
            {error}
          </div>
        )}

        <div className="bg-gray-700 rounded-lg p-8 shadow-xl max-w-md mx-auto">
          <div className="mb-6">
            <div className="flex justify-between text-gray-300 mb-4">
              <div className="text-lg font-semibold">
                You are: <span className={playerSymbol === 'X' ? 'text-blue-400' : 'text-purple-400'}>{playerSymbol}</span>
              </div>
              <div className="text-lg font-semibold">
                Current Turn: <span className={game.nextPlayer === 'X' ? 'text-blue-400' : 'text-purple-400'}>{game.nextPlayer}</span>
              </div>
            </div>
            <div className="text-xl font-semibold mb-6">
              {getStatusMessage()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {game.squares.map((square, index) => (
              <button
                key={index}
                onClick={() => handleMove(index)}
                disabled={game.gameStatus !== 'active' || Boolean(square)}
                className={`aspect-square bg-gray-600 rounded-md flex items-center justify-center text-3xl font-bold
                  ${!square && game.gameStatus === 'active' ? 'hover:bg-gray-500' : ''}
                  ${square === 'X' ? 'text-blue-400' : 'text-purple-400'}
                `}
              >
                {square}
              </button>
            ))}
          </div>

          {(game.gameStatus === 'ended' || game.gameStatus === 'draw') && (
            <div className="space-y-4">
              <div className={`text-2xl font-bold mb-4 ${
                game.winner === playerSymbol ? 'text-green-400' : 
                game.winner ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {getStatusMessage()}
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

export default GameRoom; 