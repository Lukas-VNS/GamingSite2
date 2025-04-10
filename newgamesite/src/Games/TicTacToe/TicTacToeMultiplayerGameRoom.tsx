import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { endpoints } from '../../api';
import { GameState, PlayerSymbol } from './ticTacToeLogic';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const TicTacToeMultiplayerGameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>({
    id: 0,
    squares: Array(9).fill(null),
    nextPlayer: 'X',
    gameStatus: 'active',
    player1: { id: '', username: '' },
    player2: { id: '', username: '' },
    player1Id: '',
    player2Id: '',
    player1TimeRemaining: 300,
    player2TimeRemaining: 300,
    winner: null,
    lastMoveTimestamp: new Date().toISOString()
  });
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [error, setError] = useState<string>('');
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Get the current user's ID from the token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.userId);
    }
  }, []);

  // Set up socket connection and game state management
  useEffect(() => {
    const numericGameId = parseInt(gameId || '');
    
    if (isNaN(numericGameId)) {
      setError('Invalid game ID');
      return;
    }

    const setupGame = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(endpoints.get(numericGameId), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load game');
        }

        const gameData = await response.json();
        setGame(gameData);

        const newSocket = io(API_BASE_URL, {
          auth: {
            token
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
          newSocket.emit('join_game', { gameId: numericGameId });
        });

        newSocket.on('player_assigned', (data: { player: PlayerSymbol; gameState: GameState }) => {
          setPlayerSymbol(data.player);
          setGame(data.gameState);
        });

        newSocket.on('game_update', (updatedGame: GameState) => {
          setGame(updatedGame);
        });

        newSocket.on('error', (error: any) => {
          setError(error.message || 'An error occurred');
        });

        setSocket(newSocket);

        return () => {
          if (newSocket) {
            newSocket.disconnect();
          }
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      }
    };

    setupGame();
  }, [gameId]);

  const handleMove = async (index: number) => {
    if (!socket || !game || !playerSymbol || !game.id) {
      return;
    }

    if (game.gameStatus === 'ended' || game.gameStatus === 'draw') {
      return;
    }

    if (game.nextPlayer !== playerSymbol) {
      setError("It's not your turn!");
      return;
    }

    setError('');
    socket.emit('make_move', {
      gameId: game.id,
      position: index,
      player: playerSymbol
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-8">Loading game...</h1>
        </div>
      </div>
    );
  }

  const gameStatus = {
    isActive: game.gameStatus === 'active',
    isEnded: game.gameStatus === 'ended' || game.gameStatus === 'draw',
    isDraw: game.gameStatus === 'draw',
    winner: game.winner,
    currentPlayer: game.nextPlayer === 'X' ? game.player1Id : game.player2Id,
    player1: {
      id: game.player1Id,
      username: game.player1?.username || 'Player 1',
      timeRemaining: game.player1TimeRemaining
    },
    player2: {
      id: game.player2Id,
      username: game.player2?.username || 'Player 2',
      timeRemaining: game.player2TimeRemaining
    }
  };

  return (
    <MultiplayerGameRoom
      gameType="tictactoe"
      title="Tic Tac Toe Multiplayer"
      gameStatus={gameStatus}
    >
      <div className="grid grid-cols-3 gap-2">
        {(game?.squares || Array(9).fill(null)).map((square, index) => (
          <button
            key={index}
            onClick={() => handleMove(index)}
            disabled={Boolean(square) || game.nextPlayer !== playerSymbol || game.gameStatus !== 'active'}
            className={`aspect-square bg-gray-600 rounded-md flex items-center justify-center text-3xl font-bold
              ${!square && game.nextPlayer === playerSymbol && game.gameStatus === 'active' ? 'hover:bg-gray-500' : ''}
              ${square === 'X' ? 'text-blue-400' : 'text-purple-400'}
            `}
          >
            {square}
          </button>
        ))}
      </div>
    </MultiplayerGameRoom>
  );
};

export default TicTacToeMultiplayerGameRoom;