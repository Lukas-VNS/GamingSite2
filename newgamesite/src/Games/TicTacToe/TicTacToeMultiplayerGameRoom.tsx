import React, { useState, useEffect, useRef } from 'react';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';
import TicTacToeBoard from './TicTacToeBoard';
import { useParams } from 'react-router-dom';
import { useGameSocket } from '../../context/GameSocketContext';

const TIME_LIMIT = 60 * 1;

export const TicTacToeMultiplayerGameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { socket, isConnected } = useGameSocket();
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
    boardState: Array(9).fill(''),
    player1Time: TIME_LIMIT,
    player2Time: TIME_LIMIT
  });
  const hasJoinedGame = useRef(false);
  const joinGameEmitted = useRef(false);

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = JSON.parse(atob(token.split('.')[1]));
    setCurrentUserId(payload.userId);
  }, []);

  // Handle joining the game
  useEffect(() => {
    console.log('Join game effect running:', {
      socketId: socket?.id,
      isConnected,
      gameId,
      hasJoined: hasJoinedGame.current,
      joinGameEmitted: joinGameEmitted.current
    });

    if (!socket || !isConnected || joinGameEmitted.current) {
      console.log('Skipping join game:', {
        reason: !socket ? 'no socket' : !isConnected ? 'not connected' : 'already emitted',
        socketId: socket?.id,
        isConnected,
        joinGameEmitted: joinGameEmitted.current
      });
      return;
    }

    const numericGameId = parseInt(gameId || '');
    if (isNaN(numericGameId)) {
      console.log('Invalid game ID:', gameId);
      return;
    }

    console.log('Emitting joinGame event from TicTacToeMultiplayerGameRoom:', {
      socketId: socket.id,
      gameId: numericGameId
    });
    socket.emit('joinGame', {
      gameId: numericGameId,
      gameType: 'tictactoe'
    });
    joinGameEmitted.current = true;

    return () => {
      console.log('Cleaning up join game effect:', {
        socketId: socket?.id,
        gameId,
        wasEmitted: joinGameEmitted.current
      });
      // Don't reset joinGameEmitted here
    };
  }, [socket, isConnected, gameId]);

  // Set up game event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleGameState = (data: any) => {
      // Convert 2D board state to 1D array for the TicTacToeBoard component
      const flatBoardState = data.boardState ? data.boardState.flat() : Array(9).fill('');
      
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
        boardState: flatBoardState,
        player1Time: data.player1Time || prev.player1Time,
        player2Time: data.player2Time || prev.player2Time
      }));
    };

    const handleError = (error: any) => {
      console.error('Socket error:', error);
    };

    // Remove any existing listeners before adding new ones
    socket.off('game-state', handleGameState);
    socket.off('error', handleError);

    socket.on('game-state', handleGameState);
    socket.on('error', handleError);

    return () => {
      socket.off('game-state', handleGameState);
      socket.off('error', handleError);
    };
  }, [socket, isConnected]);

  const handleMove = (position: number) => {
    if (!socket || !isConnected || !gameStatus.isActive) return;
    if (gameStatus.currentPlayer !== currentUserId) return;

    const numericGameId = parseInt(gameId || '');
    if (isNaN(numericGameId)) return;

    socket.emit('makeMove', {
      gameId: numericGameId,
      position
    });
  };

  return (
    <MultiplayerGameRoom
      gameType="tictactoe"
      title="Tic Tac Toe Multiplayer"
      gameStatus={gameStatus}
      currentUserId={currentUserId}
      player1Symbol="X"
      player2Symbol="O"
    >
      <TicTacToeBoard
        squares={gameStatus.boardState}
        onClick={handleMove}
        disabled={!gameStatus.isActive || gameStatus.currentPlayer !== currentUserId}
      />
    </MultiplayerGameRoom>
  );
};

export default TicTacToeMultiplayerGameRoom;