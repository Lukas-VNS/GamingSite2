import { Server } from 'socket.io';
import { GameState, PlayerSymbol } from './types';

export const INITIAL_TIME = 60; // 1 minute in seconds
export const DISCONNECT_TIMEOUT = 30; // 30 seconds to reconnect 

export interface TicTacToeGameState extends GameState {
  squares: Array<'X' | 'O' | null>;
  players: {
    X: string | null;
    O: string | null;
  };
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  timers: {
    X: number;
    O: number;
  };
  timerInterval: NodeJS.Timeout | null;
  disconnectTimers: {
    X: NodeJS.Timeout | null;
    O: NodeJS.Timeout | null;
  };
  playerX: {
    id: string;
    username: string;
  };
  playerO: {
    id: string;
    username: string;
  };
  playerXId: string;
  playerOId: string;
  playerXTimeRemaining: number;
  playerOTimeRemaining: number;
}

export interface Connect4GameState extends GameState {
  board: Array<Array<'red' | 'yellow' | null>>;
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
  playerRedTimeRemaining: number;
  playerYellowTimeRemaining: number;
}

export const games: Record<string, TicTacToeGameState | Connect4GameState> = {};

export function isTicTacToeGame(game: TicTacToeGameState | Connect4GameState): game is TicTacToeGameState {
  return 'squares' in game;
}

export function isConnect4Game(game: TicTacToeGameState | Connect4GameState): game is Connect4GameState {
  return 'board' in game;
}

// Initialize a game if it doesn't exist
export function initializeGame(gameId: string): TicTacToeGameState | Connect4GameState {
  if (!games[gameId]) {
    const newGame: TicTacToeGameState = {
      id: parseInt(gameId),
      squares: Array(9).fill(null),
      nextPlayer: 'X',
      gameStatus: 'waiting',
      winner: null,
      players: {
        X: null,
        O: null
      },
      readyStatus: {
        X: false,
        O: false
      },
      timers: {
        X: INITIAL_TIME,
        O: INITIAL_TIME
      },
      timerInterval: null,
      disconnectTimers: {
        X: null,
        O: null
      },
      playerX: { id: '', username: '' },
      playerO: { id: '', username: '' },
      playerXId: '',
      playerOId: '',
      playerXTimeRemaining: INITIAL_TIME,
      playerOTimeRemaining: INITIAL_TIME,
      lastMoveTimestamp: new Date().toISOString()
    };
    games[gameId] = newGame;
  }
  return games[gameId];
}

// Reset a game for a new round
export function resetGame(gameId: string, io: Server) {
  const game = games[gameId];
  if (!game) return;

  // Stop existing timer
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
  }
  
  // Clear any disconnect timers
  if (game.disconnectTimers?.X) {
    clearTimeout(game.disconnectTimers.X);
  }
  if (game.disconnectTimers?.O) {
    clearTimeout(game.disconnectTimers.O);
  }

  if (isTicTacToeGame(game)) {
    // Keep the existing players and player information
    const existingPlayers = game.players;
    const existingPlayerX = game.playerX;
    const existingPlayerO = game.playerO;
    const existingPlayerXId = game.playerXId;
    const existingPlayerOId = game.playerOId;
    
    // Reset the game state
    games[gameId] = {
      ...game,
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
      },
      playerX: existingPlayerX,
      playerO: existingPlayerO,
      playerXId: existingPlayerXId,
      playerOId: existingPlayerOId,
      playerXTimeRemaining: INITIAL_TIME,
      playerOTimeRemaining: INITIAL_TIME,
      lastMoveTimestamp: new Date().toISOString()
    };
    
    // Broadcast the reset game state
    io.to(gameId).emit('game_update', {
      squares: games[gameId].squares,
      nextPlayer: games[gameId].nextPlayer,
      readyStatus: games[gameId].readyStatus,
      timers: games[gameId].timers,
      gameStatus: games[gameId].gameStatus,
      winner: games[gameId].winner,
      playerX: games[gameId].playerX,
      playerO: games[gameId].playerO,
      playerXId: games[gameId].playerXId,
      playerOId: games[gameId].playerOId
    });
  } else if (isConnect4Game(game)) {
    // Keep the existing player information
    const existingPlayerRed = game.playerRed;
    const existingPlayerYellow = game.playerYellow;
    const existingPlayerRedId = game.playerRedId;
    const existingPlayerYellowId = game.playerYellowId;
    
    // Reset the game state
    games[gameId] = {
      ...game,
      board: Array(6).fill(null).map(() => Array(7).fill(null)),
      nextPlayer: 'red',
      gameStatus: 'waiting',
      winner: null,
      playerRed: existingPlayerRed,
      playerYellow: existingPlayerYellow,
      playerRedId: existingPlayerRedId,
      playerYellowId: existingPlayerYellowId,
      playerRedTimeRemaining: INITIAL_TIME,
      playerYellowTimeRemaining: INITIAL_TIME,
      lastMoveTimestamp: new Date().toISOString()
    };
    
    // Broadcast the reset game state
    io.to(gameId).emit('game_update', {
      board: games[gameId].board,
      nextPlayer: games[gameId].nextPlayer,
      gameStatus: games[gameId].gameStatus,
      winner: games[gameId].winner,
      playerRed: games[gameId].playerRed,
      playerYellow: games[gameId].playerYellow,
      playerRedId: games[gameId].playerRedId,
      playerYellowId: games[gameId].playerYellowId,
      playerRedTimeRemaining: games[gameId].playerRedTimeRemaining,
      playerYellowTimeRemaining: games[gameId].playerYellowTimeRemaining
    });
  }
}

// Assign player symbol (X or O)
export function assignPlayerToGame(gameId: string, socketId: string): PlayerSymbol | null {
  const game = games[gameId];
  if (!game) return null;
  
  if (isTicTacToeGame(game)) {
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
  } else if (isConnect4Game(game)) {
    // Check if this socket ID already had a position (reconnecting)
    if (game.playerRedId === socketId) return 'red';
    if (game.playerYellowId === socketId) return 'yellow';
    
    // If red is not assigned, assign red
    if (!game.playerRedId) {
      game.playerRedId = socketId;
      return 'red';
    }
    // If yellow is not assigned, assign yellow
    else if (!game.playerYellowId) {
      game.playerYellowId = socketId;
      return 'yellow';
    }
  }
  
  // Both positions filled
  return null;
}

// Count how many players are in a specific game
export function countPlayersInGame(gameId: string): number {
  const game = games[gameId];
  if (!game) return 0;
  
  let count = 0;
  if (isTicTacToeGame(game)) {
    if (game.players?.X) count++;
    if (game.players?.O) count++;
  } else if (isConnect4Game(game)) {
    if (game.playerRedId) count++;
    if (game.playerYellowId) count++;
  }
  
  return count;
}

// Broadcast game state update to all players in a game
export function broadcastGameState(gameId: string, io: Server) {
  const game = games[gameId];
  if (!game) return;
  
  io.to(gameId).emit('game_update', {
    squares: game.squares,
    nextPlayer: game.nextPlayer,
    readyStatus: game.readyStatus,
    timers: game.timers,
    gameStatus: game.gameStatus,
    winner: game.winner,
    playerX: game.playerX,
    playerO: game.playerO,
    players: game.players
  });
}

// Update player time remaining
export async function updatePlayerTimeRemaining(gameId: string, player: 'X' | 'O'): Promise<number> {
  const game = games[gameId];
  if (!game || !isTicTacToeGame(game)) return 0;

  const timeField = player === 'X' ? 'playerXTimeRemaining' : 'playerOTimeRemaining';
  const currentTime = game[timeField];
  
  if (currentTime > 0) {
    game[timeField] = currentTime - 1;
  }
  
  return game[timeField];
}

export async function updateConnect4PlayerTimeRemaining(gameId: string, player: 'red' | 'yellow'): Promise<number> {
  const game = games[gameId];
  if (!game || !isConnect4Game(game)) return 0;

  const timeField = player === 'red' ? 'playerRedTimeRemaining' : 'playerYellowTimeRemaining';
  const currentTime = game[timeField];
  
  if (currentTime > 0) {
    game[timeField] = currentTime - 1;
  }
  
  return game[timeField];
}

export function getConnectedPlayers(gameId: string): number {
  const game = games[gameId];
  if (!game) return 0;
  
  let count = 0;
  
  if (isTicTacToeGame(game)) {
    if (game.players?.X) count++;
    if (game.players?.O) count++;
  } else if (isConnect4Game(game)) {
    if (game.playerRedId) count++;
    if (game.playerYellowId) count++;
  }
  
  return count;
} 