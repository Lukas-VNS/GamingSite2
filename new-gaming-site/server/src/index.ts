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
  timers: {
    X: number; // Time in seconds
    O: number;
  };
  timerInterval: NodeJS.Timeout | null;
  gameStatus: 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  disconnectTimers: {
    X: NodeJS.Timeout | null;
    O: NodeJS.Timeout | null;
  };
}

const games: Record<string, GameState> = {};
const INITIAL_TIME = 300; // 5 minutes in seconds
const DISCONNECT_TIMEOUT = 30; // 30 seconds to reconnect

// Initialize a game if it doesn't exist
function initializeGame(gameId: string) {
  if (!games[gameId]) {
    games[gameId] = {
      squares: Array(9).fill(null),
      nextPlayer: 'X',
      players: {
        X: null,
        O: null
      },
      timers: {
        X: INITIAL_TIME,
        O: INITIAL_TIME
      },
      timerInterval: null,
      gameStatus: 'active',
      winner: null,
      disconnectTimers: {
        X: null,
        O: null
      }
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
      timers: {
        X: INITIAL_TIME,
        O: INITIAL_TIME
      },
      timerInterval: null,
      gameStatus: 'active',
      winner: null,
      disconnectTimers: {
        X: null,
        O: null
      }
    };
    
    // Start timer for player X (always starts first)
    startTimer(gameId);
    
    // Broadcast the reset game state
    io.to(gameId).emit('game_update', {
      squares: games[gameId].squares,
      nextPlayer: games[gameId].nextPlayer,
      timers: games[gameId].timers,
      gameStatus: games[gameId].gameStatus,
      winner: games[gameId].winner
    });
  }
}

// Start the timer for the current player
function startTimer(gameId: string) {
  const game = games[gameId];
  if (!game || game.gameStatus !== 'active') return;
  
  // Clear any existing interval
  if (game.timerInterval) {
    clearInterval(game.timerInterval);
    game.timerInterval = null;
  }
  
  // Start a new interval
  game.timerInterval = setInterval(() => {
    // Decrement the current player's timer
    game.timers[game.nextPlayer]--;
    
    // Check if timer ran out
    if (game.timers[game.nextPlayer] <= 0) {
      // Time's up! Current player loses
      clearInterval(game.timerInterval as NodeJS.Timeout);
      game.timerInterval = null;
      game.gameStatus = 'ended';
      game.winner = game.nextPlayer === 'X' ? 'O' : 'X';
      
      // Broadcast the result
      io.to(gameId).emit('game_update', {
        squares: game.squares,
        nextPlayer: game.nextPlayer,
        timers: game.timers,
        gameStatus: game.gameStatus,
        winner: game.winner,
        winReason: 'timeout'
      });
    } else {
      // Just update the timers
      io.to(gameId).emit('timer_update', {
        timers: game.timers
      });
    }
  }, 1000); // Update every second
}

// Assign player symbol (X or O)
function assignPlayerToGame(gameId: string, socketId: string) {
  initializeGame(gameId);
  
  const game = games[gameId];
  
  // Clear disconnect timer if player is rejoining
  if (game.players.X === null && game.disconnectTimers.X) {
    clearTimeout(game.disconnectTimers.X);
    game.disconnectTimers.X = null;
  } else if (game.players.O === null && game.disconnectTimers.O) {
    clearTimeout(game.disconnectTimers.O);
    game.disconnectTimers.O = null;
  }
  
  // If X is not assigned, assign X
  if (game.players.X === null) {
    game.players.X = socketId;
    
    // Start timer if both players are connected and game is active
    if (game.players.O && game.gameStatus === 'active' && !game.timerInterval) {
      startTimer(gameId);
    }
    
    return 'X';
  }
  // If X is assigned but not to this socket, and O is not assigned, assign O
  else if (game.players.X !== socketId && game.players.O === null) {
    game.players.O = socketId;
    
    // Start timer if game is active and not started yet
    if (game.gameStatus === 'active' && !game.timerInterval) {
      startTimer(gameId);
    }
    
    return 'O';
  }
  // Player is already in the game
  else if (game.players.X === socketId) {
    return 'X';
  }
  else if (game.players.O === socketId) {
    return 'O';
  }
  
  // Game is full or other error
  return null;
}

// Count players in a game
function countPlayersInGame(gameId: string): number {
  if (!games[gameId]) return 0;
  
  let count = 0;
  if (games[gameId].players.X) count++;
  if (games[gameId].players.O) count++;
  return count;
}

// Check if game has a winner
function checkWinner(squares: Array<'X' | 'O' | null>): 'X' | 'O' | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  
  for (const [a, b, c] of lines) {
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
    
    // Assign player to game (X or O)
    const playerSymbol = assignPlayerToGame(gameId, socket.id);
    const playersConnected = countPlayersInGame(gameId);
    
    // Send player assignment back to client
    if (playerSymbol) {
      socket.emit('player_assigned', { 
        player: playerSymbol, 
        playersConnected,
        gameStatus: games[gameId].gameStatus,
        winner: games[gameId].winner
      });
    }
    
    // Broadcast player count update to all clients in the game
    io.to(gameId).emit('players_update', { count: playersConnected });
    
    // If game exists, send current game state
    if (games[gameId]) {
      io.to(gameId).emit('game_update', {
        squares: games[gameId].squares,
        nextPlayer: games[gameId].nextPlayer,
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
    
    // Find games this user was in
    for (const gameId in games) {
      const game = games[gameId];
      
      // Handle player X disconnect
      if (game.players.X === socket.id) {
        console.log(`Player X disconnected from game ${gameId}`);
        
        // If game is active, start a disconnect timer
        if (game.gameStatus === 'active') {
          game.disconnectTimers.X = setTimeout(() => {
            // Player didn't reconnect in time, they lose
            game.gameStatus = 'ended';
            game.winner = 'O';
            
            // Stop game timer
            if (game.timerInterval) {
              clearInterval(game.timerInterval);
              game.timerInterval = null;
            }
            
            // Broadcast the forfeit
            io.to(gameId).emit('game_update', {
              squares: game.squares,
              nextPlayer: game.nextPlayer,
              timers: game.timers,
              gameStatus: game.gameStatus,
              winner: game.winner,
              winReason: 'disconnect'
            });
            
            // Mark the player as fully disconnected
            game.players.X = null;
            io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
            
          }, DISCONNECT_TIMEOUT * 1000);
        } else {
          // If game is already over, just mark them as disconnected
          game.players.X = null;
          io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
        }
      }
      // Handle player O disconnect
      else if (game.players.O === socket.id) {
        console.log(`Player O disconnected from game ${gameId}`);
        
        // If game is active, start a disconnect timer
        if (game.gameStatus === 'active') {
          game.disconnectTimers.O = setTimeout(() => {
            // Player didn't reconnect in time, they lose
            game.gameStatus = 'ended';
            game.winner = 'X';
            
            // Stop game timer
            if (game.timerInterval) {
              clearInterval(game.timerInterval);
              game.timerInterval = null;
            }
            
            // Broadcast the forfeit
            io.to(gameId).emit('game_update', {
              squares: game.squares,
              nextPlayer: game.nextPlayer,
              timers: game.timers,
              gameStatus: game.gameStatus,
              winner: game.winner,
              winReason: 'disconnect'
            });
            
            // Mark the player as fully disconnected
            game.players.O = null;
            io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
            
          }, DISCONNECT_TIMEOUT * 1000);
        } else {
          // If game is already over, just mark them as disconnected
          game.players.O = null;
          io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 