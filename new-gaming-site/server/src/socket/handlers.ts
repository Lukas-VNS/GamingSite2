import { Server, Socket } from 'socket.io';
import { games } from '../game/gameState';
import { 
  initializeGame, 
  resetGame, 
  assignPlayerToGame, 
  countPlayersInGame,
  broadcastGameState 
} from '../game/gameState';
import { checkGameStart, checkWinner, startTimer } from '../game/gameLogic';
import { PlayerSymbol } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const playerQueue: { socketId: string; userId: string }[] = [];
let currentGameId = 0; // Keep track of the last game ID

export function setupSocketHandlers(io: Server, socket: Socket) {
  console.log('A new user connected:', socket.id);
  console.log('Auth token:', socket.handshake.auth.token);
  
  socket.on('join_queue', () => {
    console.log(`User ${socket.id} joining queue`);
    console.log('Current queue length:', playerQueue.length);
    console.log('Current queue:', playerQueue);
    
    if (playerQueue.some(p => p.socketId === socket.id)) {
      console.log(`User ${socket.id} already in queue`);
      socket.emit('queue_error', 'Already in queue');
      return;
    }
    
    const token = socket.handshake.auth.token;
    console.log('Received token:', token);
    
    if (!token) {
      console.log(`User ${socket.id} not authenticated`);
      socket.emit('queue_error', 'Not authenticated');
      return;
    }
    
    playerQueue.push({ socketId: socket.id, userId: token });
    console.log(`Added user ${socket.id} to queue. New queue length:`, playerQueue.length);
    socket.emit('queue_joined');
    
    if (playerQueue.length >= 2) {
      console.log('Found 2 players, creating game...');
      const player1 = playerQueue.shift()!;
      const player2 = playerQueue.shift()!;
      
      // Create new game in database
      prisma.game.create({
        data: {
          squares: Array(9).fill(null),
          nextPlayer: 'X',
          gameStatus: 'waiting'
        }
      }).then(game => {
        console.log(`Created game ${game.id} for players:`, player1.socketId, player2.socketId);
        currentGameId = game.id;
        initializeGame(game.id.toString());
        
        io.to(player1.socketId).emit('game_created', game.id);
        io.to(player2.socketId).emit('game_created', game.id);
        console.log('Game creation notifications sent');
      });
    }
  });
  
  socket.on('join_game', (gameId: number) => {
    console.log(`User ${socket.id} joining game: ${gameId}`);
    socket.join(gameId.toString());
    
    initializeGame(gameId.toString());
    const playerSymbol = assignPlayerToGame(gameId.toString(), socket.id);
    const playersConnected = countPlayersInGame(gameId.toString());
    
    console.log(`Player ${socket.id} assigned as ${playerSymbol}`);
    
    if (playerSymbol) {
      const game = games[gameId.toString()];
      if (game) {
        // Keep game in 'waiting' state until both players are ready
        game.gameStatus = 'waiting';
        
        // Emit player assignment
        socket.emit('player_assigned', { 
          player: playerSymbol, 
          playersConnected,
          readyStatus: game.readyStatus,
          gameStatus: game.gameStatus,
          winner: null
        });
        
        // Broadcast updated state to all players
        io.to(gameId.toString()).emit('players_update', { count: playersConnected });
        io.to(gameId.toString()).emit('game_update', {
          id: gameId,
          squares: game.squares,
          nextPlayer: game.nextPlayer,
          gameStatus: game.gameStatus,
          winner: game.winner,
          readyStatus: game.readyStatus,
          players: game.players
        });

        // If both players are connected, set them as ready and start the game
        if (playersConnected === 2) {
          game.readyStatus = { X: true, O: true };
          game.gameStatus = 'active';
          game.nextPlayer = 'X';
          
          // Broadcast the final game state
          io.to(gameId.toString()).emit('game_update', {
            id: gameId,
            squares: game.squares,
            nextPlayer: game.nextPlayer,
            gameStatus: game.gameStatus,
            winner: game.winner,
            readyStatus: game.readyStatus,
            players: game.players
          });
        }
      }
    }
  });
  
  socket.on('leave_queue', () => {
    console.log(`User ${socket.id} leaving queue`);
    const index = playerQueue.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      playerQueue.splice(index, 1);
    }
  });
  
  socket.on('make_move', ({ gameId, position, player }: { gameId: string, position: number, player: PlayerSymbol }) => {
    console.log(`Move attempt: ${player} at position ${position} in game ${gameId}`);
    
    const game = games[gameId];
    if (!game) {
      console.log('Game not found');
      return;
    }
    
    // Validate that the socket ID matches the player
    if (game.players[player] !== socket.id) {
      console.log('Invalid player move attempt - wrong socket ID');
      return;
    }

    // Validate that it's the player's turn
    if (game.nextPlayer !== player) {
      console.log('Invalid player move attempt - not your turn');
      return;
    }

    // Validate that the position is valid and empty
    if (position < 0 || position > 8 || game.squares[position] !== null) {
      console.log('Invalid player move attempt - invalid position or square taken');
      return;
    }

    // Validate that the game is active
    if (game.gameStatus !== 'active') {
      console.log('Invalid player move attempt - game not active');
      return;
    }
    
    // Make the move
    game.squares[position] = player;
    
    // Check for winner or draw
    const winner = checkWinner(game.squares);
    const isDraw = !winner && game.squares.every(square => square !== null);
    
    if (winner) {
      game.gameStatus = 'ended';
      game.winner = winner;
      console.log(`Game ${gameId} won by ${winner}`);
    } else if (isDraw) {
      game.gameStatus = 'draw';
      console.log(`Game ${gameId} ended in draw`);
    } else {
      game.nextPlayer = player === 'X' ? 'O' : 'X';
      console.log(`Next turn: ${game.nextPlayer}`);
    }
    
    // Broadcast the updated game state
    io.to(gameId).emit('game_update', {
      id: parseInt(gameId),
      squares: game.squares,
      nextPlayer: game.nextPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      readyStatus: game.readyStatus,
      players: game.players
    });
  });
  
  socket.on('reset_game', (gameId) => {
    const game = games[gameId];
    
    if (game) {
      const playerSymbol = game.players.X === socket.id ? 'X' : 
                          game.players.O === socket.id ? 'O' : null;
      
      if (playerSymbol && (game.gameStatus === 'ended' || game.gameStatus === 'draw')) {
        resetGame(gameId, io);
        console.log(`Game ${gameId} reset by ${playerSymbol}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const queueIndex = playerQueue.findIndex(p => p.socketId === socket.id);
    if (queueIndex !== -1) {
      playerQueue.splice(queueIndex, 1);
    }
    
    Object.keys(games).forEach(gameId => {
      const game = games[gameId];
      
      if (game.players.X === socket.id || game.players.O === socket.id) {
        const playerSymbol = game.players.X === socket.id ? 'X' : 'O';
        game.players[playerSymbol] = null;
        game.readyStatus[playerSymbol] = false;
        
        if (game.gameStatus === 'active') {
          game.gameStatus = 'ended';
          game.winner = playerSymbol === 'X' ? 'O' : 'X';
        }
        
        io.to(gameId).emit('players_update', { count: countPlayersInGame(gameId) });
        broadcastGameState(gameId, io);
      }
    });
  });
} 