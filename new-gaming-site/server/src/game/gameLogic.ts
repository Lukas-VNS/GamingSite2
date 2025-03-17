import { Server } from 'socket.io';
import { games } from './gameState';

export type PlayerSymbol = 'X' | 'O';
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';

export interface GameState {
  id: number;
  squares: Array<PlayerSymbol | null>;
  nextPlayer: PlayerSymbol;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
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
  lastMoveTimestamp: string;
}

// Helper function to check if there's a winner
export function checkWinner(squares: Array<PlayerSymbol | null>): PlayerSymbol | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

export function isDraw(squares: Array<PlayerSymbol | null>): boolean {
  return squares.every(square => square !== null);
}

export function isValidMove(squares: Array<PlayerSymbol | null>, position: number): boolean {
  return position >= 0 && position < 9 && squares[position] === null;
}

export function getNextPlayer(currentPlayer: PlayerSymbol): PlayerSymbol {
  return currentPlayer === 'X' ? 'O' : 'X';
}

export function isPlayerTurn(gameState: GameState, userId: string): boolean {
  const isPlayerX = gameState.playerXId === userId;
  const playerSymbol = isPlayerX ? 'X' : 'O';
  return gameState.nextPlayer === playerSymbol;
}

// Check if game should start and start it if conditions are met
export function checkGameStart(gameId: string, io: Server) {
  const game = games[gameId];
  if (!game) return;
  
  console.log(`[GAME START CHECK] Game ${gameId}:`);
  console.log(`- X Ready: ${game.readyStatus.X}`);
  console.log(`- O Ready: ${game.readyStatus.O}`);
  console.log(`- Game status: ${game.gameStatus}`);
  console.log(`- Player X ID: ${game.playerXId}`);
  console.log(`- Player O ID: ${game.playerOId}`);
  
  // Only check ready status, not current connections
  if (game.readyStatus.X && game.readyStatus.O && game.gameStatus === 'waiting') {
    console.log(`[GAME START] Starting game ${gameId}!`);
    
    // Start the game
    game.gameStatus = 'active';
    game.nextPlayer = 'X'; // Ensure X goes first
    
    // Broadcast the updated game state
    io.to(gameId).emit('game_update', {
      squares: game.squares,
      nextPlayer: game.nextPlayer,
      readyStatus: game.readyStatus,
      timers: game.timers,
      gameStatus: game.gameStatus,
      winner: game.winner,
      playerX: game.playerX,
      playerO: game.playerO,
      playerXId: game.playerXId,
      playerOId: game.playerOId
    });
    
    // Start timer
    startTimer(gameId, io);
    
    console.log(`[GAME START] Game ${gameId} started successfully!`);
  }
}

// Start the timer for the current player
export function startTimer(gameId: string, io: Server) {
  const game = games[gameId];
  if (!game) return;
  
  console.log(`[TIMER] Starting timer for game ${gameId}`);
  
  // Clear any existing interval
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
  }
  
  // Set up a new interval to countdown player time
  game.timerInterval = setInterval(() => {
    // Reduce the time of the current player
    game.timers[game.nextPlayer]--;
    
    // Send timer update to clients
    io.to(gameId).emit('timer_update', { timers: game.timers });
    
    // Check if time ran out
    if (game.timers[game.nextPlayer] <= 0) {
      // Player lost due to timeout
      if (game.timerInterval) {
        clearInterval(game.timerInterval);
      }
      game.timerInterval = null;
      game.gameStatus = 'ended';
      game.winner = game.nextPlayer === 'X' ? 'O' : 'X';
      
      // Send game over notification
      io.to(gameId).emit('game_update', {
        squares: game.squares,
        nextPlayer: game.nextPlayer,
        readyStatus: game.readyStatus,
        timers: game.timers,
        gameStatus: game.gameStatus,
        winner: game.winner,
        winReason: 'timeout'
      });
    }
  }, 1000);
} 