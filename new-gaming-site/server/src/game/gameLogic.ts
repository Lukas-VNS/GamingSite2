import { Server } from 'socket.io';
import { games } from './gameState';
import { PlayerSymbol, GameState, GameStatus } from '../types';
import { isTicTacToeGame, isConnect4Game } from './gameState';

export function calculateWinner(squares: Array<PlayerSymbol | null>): PlayerSymbol | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

export function checkConnect4Winner(board: Array<Array<PlayerSymbol | null>>): PlayerSymbol | null {
  // Check horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row][col + 1] && 
          cell === board[row][col + 2] && 
          cell === board[row][col + 3]) {
        return cell;
      }
    }
  }

  // Check vertical
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row + 1][col] && 
          cell === board[row + 2][col] && 
          cell === board[row + 3][col]) {
        return cell;
      }
    }
  }

  // Check diagonal (positive slope)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row + 1][col + 1] && 
          cell === board[row + 2][col + 2] && 
          cell === board[row + 3][col + 3]) {
        return cell;
      }
    }
  }

  // Check diagonal (negative slope)
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && 
          cell === board[row - 1][col + 1] && 
          cell === board[row - 2][col + 2] && 
          cell === board[row - 3][col + 3]) {
        return cell;
      }
    }
  }

  return null;
}

export function isDraw(squares: Array<PlayerSymbol | null>): boolean {
  return squares.every(square => square !== null);
}

export function isConnect4Draw(board: Array<Array<PlayerSymbol | null>>): boolean {
  return board.every(row => row.every(cell => cell !== null));
}

export function isValidMove(squares: Array<PlayerSymbol | null>, position: number): boolean {
  return position >= 0 && position < 9 && squares[position] === null;
}

export function getLowestEmptyPosition(board: Array<Array<PlayerSymbol | null>>, column: number): number {
  for (let row = 5; row >= 0; row--) {
    if (board[row][column] === null) {
      return row;
    }
  }
  return -1;
}

export function getNextPlayer(currentPlayer: PlayerSymbol): PlayerSymbol {
  if (currentPlayer === 'X') return 'O';
  if (currentPlayer === 'O') return 'X';
  if (currentPlayer === 'red') return 'yellow';
  return 'red';
}

export function isPlayerTurn(gameState: GameState, userId: string): boolean {
  if (gameState.playerXId === userId) {
    return gameState.nextPlayer === 'X';
  }
  if (gameState.playerOId === userId) {
    return gameState.nextPlayer === 'O';
  }
  if (gameState.playerRedId === userId) {
    return gameState.nextPlayer === 'red';
  }
  if (gameState.playerYellowId === userId) {
    return gameState.nextPlayer === 'yellow';
  }
  return false;
}

// Check if game should start and start it if conditions are met
export function checkGameStart(gameId: string, io: Server) {
  const game = games[gameId];
  if (!game) return;
  
  console.log(`[GAME START CHECK] Game ${gameId}:`);
  console.log(`- X Ready: ${game.readyStatus?.X}`);
  console.log(`- O Ready: ${game.readyStatus?.O}`);
  console.log(`- Game status: ${game.gameStatus}`);
  console.log(`- Player X ID: ${game.playerXId}`);
  console.log(`- Player O ID: ${game.playerOId}`);
  
  // Only check ready status, not current connections
  if (game.readyStatus?.X && game.readyStatus?.O && game.gameStatus === 'waiting') {
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

  // Start the timer interval
  const timerInterval = setInterval(() => {
    const game = games[gameId];
    if (!game) {
      clearInterval(timerInterval);
      return;
    }

    if (isTicTacToeGame(game)) {
      // Handle Tic Tac Toe timer
      if (game.timers && game.nextPlayer) {
        const currentPlayer = game.nextPlayer as 'X' | 'O';
        game.timers[currentPlayer] = (game.timers[currentPlayer] || 0) - 1;

        // Check if time is up
        if (game.timers[currentPlayer] <= 0) {
          // End the game with the other player as winner
          game.gameStatus = 'ended';
          game.winner = currentPlayer === 'X' ? 'O' : 'X';
          
          // Clear the interval
          clearInterval(timerInterval);
        }

        // Broadcast the updated game state
        io.to(gameId).emit('game_update', {
          squares: game.squares,
          nextPlayer: game.nextPlayer,
          timers: game.timers,
          gameStatus: game.gameStatus,
          winner: game.winner,
          playerX: game.playerX,
          playerO: game.playerO,
          playerXId: game.playerXId,
          playerOId: game.playerOId
        });
      }
    } else if (isConnect4Game(game)) {
      // Handle Connect 4 timer
      const timeField = game.nextPlayer === 'red' ? 'playerRedTimeRemaining' : 'playerYellowTimeRemaining';
      game[timeField] = (game[timeField] || 0) - 1;

      // Check if time is up
      if (game[timeField] <= 0) {
        // End the game with the other player as winner
        game.gameStatus = 'ended';
        game.winner = game.nextPlayer === 'red' ? 'yellow' : 'red';
        
        // Clear the interval
        clearInterval(timerInterval);
      }

      // Broadcast the updated game state
      io.to(gameId).emit('game_update', {
        board: game.board,
        nextPlayer: game.nextPlayer,
        gameStatus: game.gameStatus,
        winner: game.winner,
        playerRed: game.playerRed,
        playerYellow: game.playerYellow,
        playerRedId: game.playerRedId,
        playerYellowId: game.playerYellowId,
        playerRedTimeRemaining: game.playerRedTimeRemaining,
        playerYellowTimeRemaining: game.playerYellowTimeRemaining
      });
    }
  }, 1000); // Update every second

  // Store the interval ID
  game.timerInterval = timerInterval;
} 