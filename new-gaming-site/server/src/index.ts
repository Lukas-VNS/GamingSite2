import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Game state management
interface GameState {
  squares: Array<'X' | 'O' | null>;
  nextPlayer: 'X' | 'O';
  players: {
    X: string | null; // socket.id of X player
    O: string | null; // socket.id of O player
  };
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  timers: {
    X: number; // Time in seconds
    O: number;
  };
  timerInterval: NodeJS.Timeout | null;
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  disconnectTimers: {
    X: NodeJS.Timeout | null;
    O: NodeJS.Timeout | null;
  };
}

const games: Record<string, GameState> = {};
const INITIAL_TIME = 60; // 1 minute in seconds
const DISCONNECT_TIMEOUT = 30; // 30 seconds to reconnect

// Initialize a game if it doesn't exist
function initializeGame(gameId: string) {
  if (!games[gameId]) {
    games[gameId] = {
      players: { X: null, O: null },
      readyStatus: { X: false, O: false },
      squares: Array(9).fill(null),
      nextPlayer: 'X',
      timers: { X: 60, O: 60 },
      timerInterval: null,
      gameStatus: 'waiting',
      winner: null,
      disconnectTimers: { X: null, O: null }
    };
  }
}

// Reset a game for a new round
function resetGame(gameId: string) {
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

// Fix the checkGameStart function to focus on ready status, not current connections
function checkGameStart(gameId: string) {
  const game = games[gameId];
  if (!game) return;
  
  console.log(`[GAME START CHECK] Game ${gameId}:`);
  console.log(`- X Ready: ${game.readyStatus.X}`);
  console.log(`- O Ready: ${game.readyStatus.O}`);
  console.log(`- Game status: ${game.gameStatus}`);
  
  // IMPORTANT: Only check ready status, not current connections
  if (game.readyStatus.X && game.readyStatus.O && game.gameStatus === 'waiting') {
    console.log(`[GAME START] Starting game ${gameId}!`);
    
    // Start the game
    game.gameStatus = 'active';
    game.nextPlayer = 'X'; // Ensure X goes first
    
    // Broadcast the updated game state to all connected clients
    io.to(gameId).emit('game_update', {
      squares: game.squares,
      nextPlayer: game.nextPlayer,
      readyStatus: game.readyStatus,
      timers: game.timers,
      gameStatus: game.gameStatus,
      winner: game.winner
    });
    
    console.log(`[GAME START] Game ${gameId} started successfully!`);
  }
}

// Start the timer for the current player
function startTimer(gameId: string) {
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

// Assign player symbol (X or O)
function assignPlayerToGame(gameId: string, socketId: string) {
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
function countPlayersInGame(gameId: string): number {
  const game = games[gameId];
  if (!game) return 0;
  
  let count = 0;
  if (game.players.X) count++;
  if (game.players.O) count++;
  
  return count;
}

// Helper function to check if there's a winner
function checkWinner(squares: Array<'X' | 'O' | null>): 'X' | 'O' | null {
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
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  
  return null;
}

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle joining a game room
  socket.on('join_game', (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game: ${gameId}`);
    
    // Initialize game if needed
    initializeGame(gameId);
    
    // Assign player to game
    const playerSymbol = assignPlayerToGame(gameId, socket.id);
    const playersConnected = countPlayersInGame(gameId);
    
    // IMPORTANT: Check if game should be active already
    if (games[gameId].readyStatus.X && games[gameId].readyStatus.O && 
        games[gameId].gameStatus === 'waiting') {
      
      console.log(`⭐ Player rejoining - Both already ready! Starting game ${gameId} ⭐`);
      games[gameId].gameStatus = 'active';
      games[gameId].nextPlayer = 'X';
    }
    
    // Send player assignment
    if (playerSymbol) {
      socket.emit('player_assigned', { 
        player: playerSymbol, 
        playersConnected,
        readyStatus: games[gameId].readyStatus,
        gameStatus: games[gameId].gameStatus,
        winner: games[gameId].winner
      });
    }
    
    // Broadcast player count update to all players in this game
    io.to(gameId).emit('players_update', { count: playersConnected });
    
    // If game exists, send current game state
    if (games[gameId]) {
      io.to(gameId).emit('game_update', {
        squares: games[gameId].squares,
        nextPlayer: games[gameId].nextPlayer,
        readyStatus: games[gameId].readyStatus,
        timers: games[gameId].timers,
        gameStatus: games[gameId].gameStatus,
        winner: games[gameId].winner
      });
    }
  });
  
  // Handle player ready status
  socket.on('player_ready', ({ gameId, player }: { gameId: string, player: 'X' | 'O' }) => {
    console.log(`Player ${player} is ready in game ${gameId}`);
    
    if (!games[gameId]) return;
    
    // Mark player as ready
    games[gameId].readyStatus[player] = true;
    
    // Log ready status for debugging
    console.log(`READY STATUS - X: ${games[gameId].readyStatus.X}, O: ${games[gameId].readyStatus.O}`);
    
    // Broadcast ready status update
    io.to(gameId).emit('ready_update', {
      readyStatus: games[gameId].readyStatus
    });
    
    // CRITICAL FIX: Check if both players are ready and force start the game
    if (games[gameId].readyStatus.X && games[gameId].readyStatus.O) {
      console.log(`⭐ BOTH PLAYERS READY! Starting game ${gameId} ⭐`);
      
      // Force game to active state
      games[gameId].gameStatus = 'active';
      games[gameId].nextPlayer = 'X';
      
      // Send game start to everyone
      io.to(gameId).emit('game_update', {
        squares: games[gameId].squares,
        nextPlayer: games[gameId].nextPlayer,
        readyStatus: games[gameId].readyStatus,
        timers: games[gameId].timers,
        gameStatus: games[gameId].gameStatus,
        winner: games[gameId].winner
      });
    }
  });
  
  // Handle game move
  socket.on('make_move', ({ gameId, position, player }) => {
    console.log(`Move received: ${player} at position ${position} in game ${gameId}`);
    const game = games[gameId];
    
    // Verify it's a valid move, the correct player's turn, and game is active
    if (
      game && 
      game.gameStatus === 'active' &&
      game.nextPlayer === player &&
      game.squares[position] === null
    ) {
      // Update game state
      game.squares[position] = player;
      
      // Check for winner or draw
      const winner = checkWinner(game.squares);
      const isDraw = !winner && game.squares.every(square => square !== null);
      
      if (winner) {
        game.gameStatus = 'ended';
        game.winner = winner;
        
        // Stop the timer
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
          game.timerInterval = null;
        }
      } else if (isDraw) {
        game.gameStatus = 'draw';
        
        // Stop the timer
        if (game.timerInterval) {
          clearInterval(game.timerInterval);
          game.timerInterval = null;
        }
      } else {
        // Switch player turn
        game.nextPlayer = player === 'X' ? 'O' : 'X';
        
        // Restart the timer for the next player
        startTimer(gameId);
      }
      
      // Broadcast updated game state to all clients in the game
      io.to(gameId).emit('game_update', {
        squares: game.squares,
        nextPlayer: game.nextPlayer,
        readyStatus: game.readyStatus,
        timers: game.timers,
        gameStatus: game.gameStatus,
        winner: game.winner
      });
    }
  });
  
  // Handle reset game request
  socket.on('reset_game', (gameId) => {
    const game = games[gameId];
    
    if (game) {
      const playerSymbol = game.players.X === socket.id ? 'X' : 
                          game.players.O === socket.id ? 'O' : null;
      
      // Only allow players in the game to reset it, and only after it ended
      if (playerSymbol && (game.gameStatus === 'ended' || game.gameStatus === 'draw')) {
        resetGame(gameId);
        console.log(`Game ${gameId} reset by ${playerSymbol}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find if this socket was assigned to any game
    Object.keys(games).forEach(gameId => {
      const game = games[gameId];
      
      // Check if this was player X
      if (game.players.X === socket.id) {
        // Just set the player socket to null
        game.players.X = null;
        
        // Broadcast that a player disconnected
        io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
        
        console.log(`Player X disconnected from game ${gameId}`);
      }
      
      // Same for player O
      else if (game.players.O === socket.id) {
        game.players.O = null;
        io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
        
        console.log(`Player O disconnected from game ${gameId}`);
      }
    });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 