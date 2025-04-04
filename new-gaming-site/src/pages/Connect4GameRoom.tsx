import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { socketService } from '../services/socketService';
import Connect4Board from '../components/Game/Connect4Board';
import { PlayerSymbol, checkWinner, getLowestEmptyPosition } from '../game/connect4Logic';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

interface Connect4GameState {
  id: number;
  board: Array<Array<PlayerSymbol | null>>;
  nextPlayer: PlayerSymbol;
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: PlayerSymbol | null;
  playerRed: {
    id: string;
    username: string;
  };
  playerYellow: {
    id: string;
    username: string;
  };
  playerRedId: string;
  playerYellowId: string;
  lastMoveTimestamp: string;
  playerRedTimeRemaining: number;
  playerYellowTimeRemaining: number;
}

const Connect4GameRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Connect4GameState | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [error, setError] = useState<string>('');
  const [timeExpiredMessage, setTimeExpiredMessage] = useState<string | null>(null);
  const [displayedTimes, setDisplayedTimes] = useState({
    playerRed: 60,
    playerYellow: 60
  });

  // Update displayed times when game state changes
  useEffect(() => {
    if (game) {
      console.log('[CONNECT4] Game state changed, updating displayed times:', {
        playerRedTimeRemaining: game.playerRedTimeRemaining,
        playerYellowTimeRemaining: game.playerYellowTimeRemaining,
        lastMoveTimestamp: game.lastMoveTimestamp
      });
      
      // Always update the displayed times from the server
      // This ensures we're in sync with the server's timer values
      setDisplayedTimes({
        playerRed: game.playerRedTimeRemaining,
        playerYellow: game.playerYellowTimeRemaining
      });
    }
  }, [game?.playerRedTimeRemaining, game?.playerYellowTimeRemaining]);

  // Client-side timer countdown
  useEffect(() => {
    if (!game || game.gameStatus !== 'active') return;

    const timer = setInterval(() => {
      const now = new Date();
      const lastMove = new Date(game.lastMoveTimestamp);
      const timeElapsed = Math.floor((now.getTime() - lastMove.getTime()) / 1000);

      setDisplayedTimes(prev => {
        const newTimes = { ...prev };
        if (game.nextPlayer === 'red') {
          newTimes.playerRed = Math.max(0, game.playerRedTimeRemaining - timeElapsed);
        } else {
          newTimes.playerYellow = Math.max(0, game.playerYellowTimeRemaining - timeElapsed);
        }
        return newTimes;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game?.lastMoveTimestamp, game?.nextPlayer, game?.gameStatus, game?.playerRedTimeRemaining, game?.playerYellowTimeRemaining]);

  useEffect(() => {
    const numericGameId = parseInt(gameId || '');

    if (isNaN(numericGameId)) {
      console.error('[CONNECT4] Invalid game ID:', gameId);
      setError('Invalid game ID');
      return;
    }

    const checkAuthorization = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('[CONNECT4] No auth token found');
          setError('Please log in to join the game');
          return false;
        }

        // Check if user is authorized to view this game
        const response = await fetch(`${API_BASE_URL}/api/games/connect4-games/${numericGameId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 403) {
          console.error('[CONNECT4] User not authorized for this game');
          setError('You are not authorized to view this game');
          return false;
        }

        if (!response.ok) {
          throw new Error('Failed to load game');
        }

        const gameData = await response.json();
        console.log('[CONNECT4] Received game data:', gameData);
        setGame(gameData.game);
        return true;
      } catch (error) {
        console.error('[CONNECT4] Auth check error:', error);
        setError('Failed to verify game access');
        return false;
      }
    };

    const setupGame = async () => {
      try {
        const isAuthorized = await checkAuthorization();
        if (!isAuthorized) {
          return;
        }

        console.log('[CONNECT4] Setting up game with ID:', numericGameId);
        
        // Connect to socket and join game
        socketService.connect();
        socketService.joinConnect4Game(numericGameId);

        // Handle player assignment
        socketService.onConnect4PlayerAssigned((data) => {
          console.log('[CONNECT4] Player assigned:', data);
          setPlayerSymbol(data.player);
          setGame(data.gameState);
        });

        // Handle game updates
        socketService.onConnect4GameUpdate((updatedGame) => {
          console.log('[CONNECT4] Received game update:', updatedGame);
          setGame(updatedGame);
        });

        // Handle time expiration
        socketService.onConnect4TimeExpired((data) => {
          console.log('[CONNECT4] Time expired:', data);
          // No need to set timeExpiredMessage or error message
          // The game state will be updated with the winner, and getGameStatus will handle the display
        });

        // Handle errors
        socketService.onConnect4Error((data) => {
          console.error('[CONNECT4] Socket error:', data);
          setError(data.message || 'An error occurred');
        });

        return () => {
          socketService.removeAllListeners();
          socketService.disconnect();
        };
      } catch (error) {
        console.error('[CONNECT4] Setup error:', error);
        setError('Failed to set up game connection');
      }
    };

    setupGame();
  }, [gameId]);

  const handleColumnClick = (col: number) => {
    if (!game || !playerSymbol || !game.id) {
      return;
    }

    // Check if game is over
    if (game.gameStatus === 'ended' || game.gameStatus === 'draw') {
      return;
    }

    setError('');
    
    // Check if it's the player's turn
    if (game.nextPlayer !== playerSymbol) {
      setError("It's not your turn!");
      return;
    }

    // Find the lowest empty position in the column
    const position = getLowestEmptyPosition(game.board, col);
    if (position === null) {
      setError('This column is full!');
      return;
    }

    console.log('Making move:', { gameId: game.id, column: col });
    socketService.makeConnect4Move(game.id, col);
  };

  const handlePlayAgain = () => {
    // Clean up socket connection before navigation
    socketService.disconnect();
    // Navigate to multiplayer page without auto-join
    navigate('/connect4/multiplayer', { replace: true });
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const getGameStatus = () => {
    if (!game) return 'Loading...';
    
    if (game.gameStatus === 'waiting') {
      return 'Waiting for opponent...';
    }

    if (game.gameStatus === 'active') {
      return game.nextPlayer === playerSymbol ? 'Your turn!' : "Opponent's turn...";
    }

    if (game.gameStatus === 'ended') {
      if (game.winner === playerSymbol) {
        return 'You win!';
      } else if (game.winner) {
        return 'You lose!';
      }
    }

    if (game.gameStatus === 'draw') {
      return 'Draw!';
    }

    return 'Game Over!';
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Connect 4
        </h1>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-md mb-8">
            {error}
            {error.includes('not authorized') && (
              <div className="mt-4">
                <button
                  onClick={handleReturnHome}
                  className="bg-white text-red-500 py-2 px-6 rounded-md transition-colors font-bold"
                >
                  Go Home
                </button>
              </div>
            )}
          </div>
        )}

        {!error && (
          <div className="rounded-lg p-8 shadow-xl">
            <div className="mb-8">
              {game && (
                <div className="flex justify-between mb-4">
                  <div className="w-1/2">
                    <div className="h-6 flex items-center justify-center">
                      {playerSymbol === 'red' && (
                        <div className="text-white font-bold">You:</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-bold mb-1">
                        {game.playerRed?.username || 'Red Player'}
                      </div>
                      <div className="text-red-500 font-bold">
                        Red: {formatTime(displayedTimes.playerRed)}
                      </div>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="h-6 flex items-center justify-center">
                      {playerSymbol === 'yellow' && (
                        <div className="text-white font-bold">You:</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-500 font-bold mb-1">
                        {game.playerYellow?.username || 'Yellow Player'}
                      </div>
                      <div className="text-yellow-500 font-bold">
                        Yellow: {formatTime(displayedTimes.playerYellow)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <h2 className="text-2xl font-semibold mb-4">{getGameStatus()}</h2>
            </div>

            {game && (
              <div className="p-4 rounded-lg shadow-inner">
                <Connect4Board
                  squares={game.board}
                  onColumnClick={handleColumnClick}
                  disabled={game.nextPlayer !== playerSymbol || game.gameStatus !== 'active'}
                />
              </div>
            )}

            {game?.gameStatus === 'ended' && (
              <div className="mt-8 flex flex-row justify-center space-x-4">
                <button
                  onClick={handlePlayAgain}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-md transition-colors"
                >
                  Play Again
                </button>
                <button
                  onClick={handleReturnHome}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-md transition-colors"
                >
                  Return Home
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Connect4GameRoom; 