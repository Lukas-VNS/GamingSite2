import { Server } from 'socket.io';
import { GameState, PlayerSymbol } from '../types';
import { INITIAL_TIME } from '../config';

export const games: Record<string, GameState> = {};

// Initialize a game if it doesn't exist
export function initializeGame(gameId: string) {
  if (!games[gameId]) {
    games[gameId] = {
      players: { X: null, O: null },
      readyStatus: { X: false, O: false },
      squares: Array(9).fill(null),
      nextPlayer: 'X',
      timers: { X: INITIAL_TIME, O: INITIAL_TIME },
      timerInterval: null,
      gameStatus: 'waiting',
      winner: null,
      disconnectTimers: { X: null, O: null }
    };
  }
}

// Reset a game for a new round
export function resetGame(gameId: string, io: Server) {
  if (games[gameId]) {
    // Stop existing timer
    if (games[gameId].timerInterval) {
      clearInterval(games[gameId].timerInterval);
    }
    
    // Clear any disconnect timers
    if (games[gameId].disconnectTimers.X) {
      clearTimeout(games[gameId].disconnectTimers.X);
    }
    if (games[gameId].disconnectTimers.O) {
      clearTimeout(games[gameId].disconnectTimers.O);
    }
    
    games[gameId] = {
      ...games[gameId],
      squares: Array(9).fill(null),
      nextPlayer: 'X',
      readyStatus: {
        X: false,
        O: false
      },
      timers: {
        X: INITIAL_TIME,
        O: INITIAL_TIME
      },
      timerInterval: null,
      gameStatus: 'waiting',
      winner: null,
      disconnectTimers: {
        X: null,
        O: null
      }
    };
    
    // Broadcast the reset game state
    io.to(gameId).emit('game_update', {
      squares: games[gameId].squares,
      nextPlayer: games[gameId].nextPlayer,
      readyStatus: games[gameId].readyStatus,
      timers: games[gameId].timers,
      gameStatus: games[gameId].gameStatus,
      winner: games[gameId].winner
    });
  }
}

// Assign player symbol (X or O)
export function assignPlayerToGame(gameId: string, socketId: string): PlayerSymbol | null {
  const game = games[gameId];
  if (!game) return null;
  
  // Check if this socket ID already had a position (reconnecting)
  if (game.players.X === socketId) return 'X';
  if (game.players.O === socketId) return 'O';
  
  // If X is not assigned, assign X
  if (game.players.X === null) {
    game.players.X = socketId;
    return 'X';
  }
  // If O is not assigned, assign O
  else if (game.players.O === null) {
    game.players.O = socketId;
    return 'O';
  }
  
  // Both positions filled
  return null;
}

// Count how many players are in a specific game
export function countPlayersInGame(gameId: string): number {
  const game = games[gameId];
  if (!game) return 0;
  
  let count = 0;
  if (game.players.X) count++;
  if (game.players.O) count++;
  
  return count;
} 