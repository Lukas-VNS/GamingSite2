import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { endpoints } from '../config/api';
import { GameState, PlayerSymbol, GameStatus, isPlayerTurn } from '../game/gameLogic';

interface PlayerAssignedData {
  player: 'X' | 'O';
  playersConnected: number;
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  playerX: {
    id: string;
    username: string;
  }
  playerO: {
    id: string;
    username: string;
  };
  playerXId: string;
  playerOId: string;
  playerXTimeRemaining: number;
  playerOTimeRemaining: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const GameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [error, setError] = useState<string>('');
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [displayedTimes, setDisplayedTimes] = useState({
    playerX: 60,
    playerO: 60
  });

  // Get the current user's ID from the token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    }
  }, []);

  // Update displayed times when game state changes
  useEffect(() => {
    if (game) {
      console.log('Game state changed, updating displayed times:', {
        playerXTimeRemaining: game.playerXTimeRemaining,
        playerOTimeRemaining: game.playerOTimeRemaining,
        lastMoveTimestamp: game.lastMoveTimestamp
      });
      // Only update the displayed times if the server sent new time remaining values
      if (game.playerXTimeRemaining !== displayedTimes.playerX || game.playerOTimeRemaining !== displayedTimes.playerO) {
        setDisplayedTimes({
          playerX: game.playerXTimeRemaining,
          playerO: game.playerOTimeRemaining
        });
      }
    }
  }, [game?.playerXTimeRemaining, game?.playerOTimeRemaining]);

  // Client-side timer countdown
  useEffect(() => {
    if (!game || game.gameStatus !== 'active') return;

    console.log('Timer effect started with game state:', {
      playerXTimeRemaining: game.playerXTimeRemaining,
      playerOTimeRemaining: game.playerOTimeRemaining,
      lastMoveTimestamp: game.lastMoveTimestamp,
      nextPlayer: game.nextPlayer
    });

    const lastMoveTime = new Date(game.lastMoveTimestamp).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastMoveTime) / 1000);
      
      setDisplayedTimes(prev => {
        const currentPlayer = game.nextPlayer;
        const newTimes = { ...prev };
        
        if (currentPlayer === 'X') {
          // Only count down if it's X's turn
          newTimes.playerX = Math.max(0, game.playerXTimeRemaining - elapsedSeconds);
          // Check if time has expired
          if (newTimes.playerX <= 0) {
            // Update game state to show end game message
            setGame(prev => {
              if (!prev) return null;
              return {
                ...prev,
                gameStatus: 'ended',
                winner: 'O'
              };
            });
          }
        } else {
          // Only count down if it's O's turn
          newTimes.playerO = Math.max(0, game.playerOTimeRemaining - elapsedSeconds);
          // Check if time has expired
          if (newTimes.playerO <= 0) {
            // Update game state to show end game message
            setGame(prev => {
              if (!prev) return null;
              return {
                ...prev,
                gameStatus: 'ended',
                winner: 'X'
              };
            });
          }
        }
        
        return newTimes;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.gameStatus, game?.nextPlayer, game?.lastMoveTimestamp, game?.playerXTimeRemaining, game?.playerOTimeRemaining]);

  // Set up socket connection and game state management
  useEffect(() => {
    const numericGameId = parseInt(gameId || '');
    
    if (isNaN(numericGameId)) {
      setError('Invalid game ID');
      return;
    }

    // First check if user is authorized to view this game
    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsUnauthorized(true);
          return false;
        }

        console.log('Fetching game data for ID:', numericGameId);
        const response = await fetch(endpoints.get(numericGameId), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 403) {
          setIsUnauthorized(true);
          return false;
        }

        if (!response.ok) {
          throw new Error('Failed to load game');
        }

        const gameData = await response.json();
        console.log('Received game data:', gameData);
        setGame(gameData);
        return true;
      } catch (err) {
        console.error('Error loading game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
        return false;
      }
    };

    const setupGame = async () => {
      const isAuthorized = await checkAuthorization();
      if (!isAuthorized) {
        return;
      }

      const newSocket = io(API_BASE_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: {
          gameType: 'tic-tac-toe'
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to game room with socket ID:', newSocket.id);
        console.log('Emitting join_game with ID:', numericGameId);
        newSocket.emit('join_game', { gameId: numericGameId });
      });

      newSocket.on('player_assigned', (data: { player: PlayerSymbol; gameState: GameState }) => {
        console.log('Player assigned:', data);
        setPlayerSymbol(data.player);
        setGame(data.gameState);
      });

      newSocket.on('game_update', (updatedGame: GameState) => {
        console.log('Received game update:', updatedGame);
        setGame(updatedGame);
      });

      newSocket.on('time_expired', (data: { winner: PlayerSymbol; loser: PlayerSymbol; message: string }) => {
        console.log('Time expired:', data);
        // Update game state to show end game message
        setGame(prev => {
          if (!prev) return null;
          return {
            ...prev,
            gameStatus: 'ended',
            winner: data.winner
          };
        });
      });

      newSocket.on('error', (error: any) => {
        console.error('Socket error:', error);
        setError(error.message || 'An error occurred');
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    };

    setupGame();
  }, [gameId]);

  // Add logging for game state changes
  useEffect(() => {
    console.log('Game state changed:', game);
    console.log('Current player symbol:', playerSymbol);
    console.log('Socket connected:', !!socket);
  }, [game, playerSymbol, socket]);

  const handleMove = async (index: number) => {
    console.log('handleMove called with index:', index);
    console.log('Current game state:', game);
    console.log('Current player symbol:', playerSymbol);
    console.log('Socket connected:', !!socket);

    if (!socket || !game || !playerSymbol || !game.id) {
      console.log('Cannot make move:', { socket: !!socket, game: !!game, playerSymbol, gameId: game?.id });
      return;
    }

    // Check if game is over
    if (game.gameStatus === 'ended' || game.gameStatus === 'draw') {
      console.log('Game is already over, cannot make move');
      return;
    }

    // Check if player has time remaining
    const timeRemaining = playerSymbol === 'X' ? game.playerXTimeRemaining : game.playerOTimeRemaining;
    if (timeRemaining <= 0) {
      console.log('Player ran out of time, cannot make move');
      setError('Time expired!');
      return;
    }

    setError('');
    
    // Check if it's the player's turn
    if (game.nextPlayer !== playerSymbol) {
      console.log('Not your turn:', { nextPlayer: game.nextPlayer, playerSymbol });
      setError("It's not your turn!");
      return;
    }
    
    console.log('Making move:', { gameId: game.id, position: index, player: playerSymbol });
    socket.emit('make_move', {
      gameId: game.id,
      position: index,
      player: playerSymbol
    });
  };

  const handlePlayAgain = () => {
    // Clean up socket connection before navigation
    if (socket) {
      socket.disconnect();
    }
    // Navigate to multiplayer page without auto-join
    navigate('/tictactoe/multiplayer', { replace: true });
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const getStatusMessage = (isEndGameMessage: boolean = false) => {
    if (!game) return '';
    
    console.log('Getting status message:', {
      gameStatus: game.gameStatus,
      winner: game.winner,
      playerSymbol,
      isEndGameMessage
    });
    
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
    
    // Handle end game states
    if (game.gameStatus === 'ended' && game.winner !== null) {
      console.log('Game ended with winner:', game.winner);
      if (game.winner === playerSymbol) {
        return 'You won! 🎉';
      } else {
        return 'You lost! 😔';
      }
    }
    
    if (game.gameStatus === 'draw') {
      console.log('Game ended in draw');
      return "It's a draw! 🤝";
    }
    
    return '';
  };

  const formatTime = (seconds: number): string => {
    console.log('formatTime called with seconds:', seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!game || !game.playerX || !game.playerO) {
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
          <div className="text-xl">Loading game data...</div>
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
          {/* Player Names and Timers */}
          <div className="flex justify-between items-center mb-4">
            <div className={`text-center flex-1 p-3 rounded-lg ${game.nextPlayer === 'X' ? 'bg-blue-500/10' : ''}`}>
              <div className="text-sm text-gray-400">Player X</div>
              <div className={`font-bold ${game.nextPlayer === 'X' ? 'text-blue-400' : 'text-gray-300'} ${game.playerX.id === currentUserId ? 'underline' : ''}`}>
                {game.playerX.username}
              </div>
              <div className={`text-lg mt-2 ${game.nextPlayer === 'X' ? 'text-blue-400' : 'text-gray-400'}`}>
                {formatTime(displayedTimes.playerX)}
              </div>
            </div>
            <div className="mx-4 text-gray-500">vs</div>
            <div className={`text-center flex-1 p-3 rounded-lg ${game.nextPlayer === 'O' ? 'bg-purple-500/10' : ''}`}>
              <div className="text-sm text-gray-400">Player O</div>
              <div className={`font-bold ${game.nextPlayer === 'O' ? 'text-purple-400' : 'text-gray-300'} ${game.playerO.id === currentUserId ? 'underline' : ''}`}>
                {game.playerO.username}
              </div>
              <div className={`text-lg mt-2 ${game.nextPlayer === 'O' ? 'text-purple-400' : 'text-gray-400'}`}>
                {formatTime(displayedTimes.playerO)}
              </div>
            </div>
          </div>

          {/* Turn Status Message */}
          {game.gameStatus === 'active' && (
            <div className="text-xl font-semibold mb-6">
              {game.nextPlayer === playerSymbol ? 'Your turn' : "Opponent's turn"}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-6">
            {game.squares.map((square, index) => {
              const isGameOver = game.gameStatus === 'ended' || game.gameStatus === 'draw';
              const isDisabled = isGameOver || Boolean(square) || game.nextPlayer !== playerSymbol;
              console.log(`Square ${index}:`, { 
                square, 
                isDisabled, 
                gameStatus: game.gameStatus,
                isGameOver,
                nextPlayer: game.nextPlayer,
                playerSymbol
              });
              
              return (
                <button
                  key={index}
                  onClick={() => handleMove(index)}
                  disabled={isDisabled}
                  className={`aspect-square bg-gray-600 rounded-md flex items-center justify-center text-3xl font-bold
                    ${!isDisabled ? 'hover:bg-gray-500' : ''}
                    ${square === 'X' ? 'text-blue-400' : 'text-purple-400'}
                  `}
                >
                  {square}
                </button>
              );
            })}
          </div>

          {/* End game section */}
          {(() => {
            const isGameOver = game.gameStatus === 'ended' || game.gameStatus === 'draw';
            console.log('End game check:', {
              gameStatus: game.gameStatus,
              winner: game.winner,
              isGameOver,
              playerSymbol
            });
            
            if (isGameOver) {
              return (
                <div className="space-y-4">
                  <div className={`text-2xl font-bold mb-4 ${
                    game.gameStatus === 'draw' ? 'text-white' :
                    game.winner === playerSymbol ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {game.gameStatus === 'draw' ? "It's a draw! 🤝" :
                     game.winner === playerSymbol ? 'You won! 🎉' : 'You lost! 😔'}
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
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;