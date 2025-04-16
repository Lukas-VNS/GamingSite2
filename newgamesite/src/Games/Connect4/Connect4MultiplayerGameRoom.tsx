import React, { useState, useEffect } from 'react';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';
import Connect4Board from './Connect4Board';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const TIME_LIMIT = 60 * 3;
export const Connect4MultiplayerGameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [socket, setSocket] = useState<typeof io.Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStatus, setGameStatus] = useState({
    isActive: false,
    isEnded: false,
    isDraw: false,
    winner: null as string | null,
    currentPlayer: '',
    player1: {
      id: '',
      username: 'Waiting for player...'
    },
    player2: {
      id: '',
      username: 'Waiting for player...'
    },
    boardState: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)),
    player1Time: TIME_LIMIT, // 2 minutes for Connect4
    player2Time: TIME_LIMIT
  });

  // Get current user ID from token and set up socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Not authenticated');
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    setCurrentUserId(payload.userId);

    const newSocket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const handleConnect = () => {
      console.log('Socket connected');
      setIsConnected(true);

      const numericGameId = parseInt(gameId || '');
      if (isNaN(numericGameId)) return;

      newSocket.emit('joinGame', {
        gameId: numericGameId,
        gameType: 'connect4'
      });
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    };

    const handleGameState = (data: any) => {
      console.log('Received game state:', data);
      
      // Parse board state if it's a string
      const boardState = typeof data.boardState === 'string' 
        ? JSON.parse(data.boardState)
        : data.boardState;

      // Check if the game has ended due to time
      const isTimeBasedWin = data.player1Time <= 0 || data.player2Time <= 0;
      const timeBasedWinner = data.player1Time <= 0 ? data.player2Id : 
                             data.player2Time <= 0 ? data.player1Id : null;

      setGameStatus(prev => ({
        ...prev,
        isActive: data.state === 'ACTIVE' && !isTimeBasedWin,
        isEnded: data.state === 'PLAYER1_WIN' || data.state === 'PLAYER2_WIN' || data.state === 'DRAW' || isTimeBasedWin,
        isDraw: data.state === 'DRAW',
        winner: timeBasedWinner || (data.state === 'PLAYER1_WIN' ? data.player1Id : 
                data.state === 'PLAYER2_WIN' ? data.player2Id : null),
        currentPlayer: data.nextPlayer === 1 ? data.player1Id : data.player2Id,
        player1: data.player1 ? {
          id: data.player1Id,
          username: data.player1.username
        } : prev.player1,
        player2: data.player2 ? {
          id: data.player2Id,
          username: data.player2.username
        } : prev.player2,
        boardState: boardState,
        player1Time: data.player1Time || prev.player1Time,
        player2Time: data.player2Time || prev.player2Time
      }));
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
    };

    // Set up event handlers
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('game-state', handleGameState);
    newSocket.on('error', handleError);

    setSocket(newSocket);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('connect_error', handleConnectError);
      newSocket.off('game-state', handleGameState);
      newSocket.off('error', handleError);
      newSocket.disconnect();
    };
  }, [gameId]); // Only depend on gameId

  const handleMove = (column: number) => {
    if (!socket || !gameStatus.isActive) return;
    if (gameStatus.currentPlayer !== currentUserId) return;

    // Check if the column has an empty space
    const columnHasSpace = gameStatus.boardState.some(row => row[column] === '');
    if (!columnHasSpace) {
      console.log('Column is full');
      return;
    }

    const numericGameId = parseInt(gameId || '');
    if (isNaN(numericGameId)) return;

    socket.emit('makeMove', {
      gameId: numericGameId,
      position: column
    });
  };

  return (
    <MultiplayerGameRoom
      gameType="connect4"
      title="Connect 4 Multiplayer"
      gameStatus={gameStatus}
      currentUserId={currentUserId}
      player1Symbol="Red"
      player2Symbol="Yellow"
    >
      <Connect4Board
        board={gameStatus.boardState}
        onColumnClick={handleMove}
        disabled={!gameStatus.isActive || gameStatus.currentPlayer !== currentUserId}
      />
    </MultiplayerGameRoom>
  );
};

export default Connect4MultiplayerGameRoom; 