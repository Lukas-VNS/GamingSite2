import { Server, Socket } from 'socket.io';
import { games } from '../game/gameState';
import { 
  initializeGame, 
  resetGame, 
  assignPlayerToGame, 
  countPlayersInGame 
} from '../game/gameState';
import { checkGameStart, checkWinner, startTimer } from '../game/gameLogic';
import { PlayerSymbol } from '../types';

export function setupSocketHandlers(io: Server, socket: Socket) {
  console.log('\n\nA New user connected:', socket.id, '\n\n');
  
  // Handle joining a game room
  socket.on('join_game', (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game: ${gameId}`);
    
    // Initialize game if needed
    initializeGame(gameId);
    
    // Assign player to game
    const playerSymbol = assignPlayerToGame(gameId, socket.id);
    const playersConnected = countPlayersInGame(gameId);
    
    // Check if game should be active already
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
  socket.on('player_ready', ({ gameId, player }: { gameId: string, player: PlayerSymbol }) => {
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
  socket.on('make_move', ({ gameId, position, player }: { gameId: string, position: number, player: PlayerSymbol }) => {
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
        startTimer(gameId, io);
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
        resetGame(gameId, io);
        console.log(`Game ${gameId} reset by ${playerSymbol}`);
      }
    }
  });

  // Handle disconnection
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
} 