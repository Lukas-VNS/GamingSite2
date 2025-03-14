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
import jwt from 'jsonwebtoken';

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

    try {
      // Decode the JWT token to get the actual user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        userId: string;
        email: string;
      };

      playerQueue.push({ socketId: socket.id, userId: decoded.userId });
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
            gameStatus: 'waiting',
            playerX: {
              connect: {
                id: player1.userId
              }
            },
            playerO: {
              connect: {
                id: player2.userId
              }
            }
          },
          include: {
            playerX: {
              select: {
                id: true,
                username: true
              }
            },
            playerO: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }).then(game => {
          console.log(`Created game ${game.id} for players:`, player1.socketId, player2.socketId);
          currentGameId = game.id;
          
          // Initialize game with player information
          initializeGame(game.id.toString());
          const gameState = games[game.id.toString()];
          gameState.playerX = game.playerX;
          gameState.playerO = game.playerO;
          gameState.players = { X: player1.socketId, O: player2.socketId };
          gameState.readyStatus = { X: true, O: true };
          gameState.gameStatus = 'active';
          gameState.nextPlayer = 'X';
          
          // Notify players of game creation
          io.to(player1.socketId).emit('game_created', game.id);
          io.to(player2.socketId).emit('game_created', game.id);
          console.log('Game creation notifications sent');
          
          // Broadcast initial game state
          io.to(player1.socketId).emit('game_update', {
            id: game.id,
            squares: gameState.squares,
            nextPlayer: gameState.nextPlayer,
            gameStatus: gameState.gameStatus,
            winner: gameState.winner,
            readyStatus: gameState.readyStatus,
            players: gameState.players,
            playerX: game.playerX,
            playerO: game.playerO
          });
          io.to(player2.socketId).emit('game_update', {
            id: game.id,
            squares: gameState.squares,
            nextPlayer: gameState.nextPlayer,
            gameStatus: gameState.gameStatus,
            winner: gameState.winner,
            readyStatus: gameState.readyStatus,
            players: gameState.players,
            playerX: game.playerX,
            playerO: game.playerO
          });
        }).catch(error => {
          console.error('Error creating game:', error);
          // Return players to queue if game creation fails
          playerQueue.unshift(player1, player2);
          io.to(player1.socketId).emit('queue_error', 'Failed to create game');
          io.to(player2.socketId).emit('queue_error', 'Failed to create game');
        });
      }
    } catch (error) {
      console.error('Invalid token:', error);
      socket.emit('queue_error', 'Invalid authentication token');
      return;
    }
  });
  
  socket.on('join_game', async (gameId: number) => {
    console.log(`User ${socket.id} joining game: ${gameId}`);
    socket.join(gameId.toString());
    
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('No auth token provided');
      return;
    }

    try {
      // Decode the JWT token to get the actual user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        userId: string;
        email: string;
      };

      // Get game data from database first
      const dbGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: {
            select: {
              id: true,
              username: true
            }
          },
          playerO: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      if (!dbGame) {
        console.log('Game not found in database');
        return;
      }

      // Get or initialize game state
      let game = games[gameId.toString()];
      if (!game) {
        initializeGame(gameId.toString());
        game = games[gameId.toString()];
        game.playerX = dbGame.playerX;
        game.playerO = dbGame.playerO;
      }
      
      // Determine player symbol based on user ID
      let playerSymbol: 'X' | 'O' | null = null;
      if (dbGame.playerX?.id === decoded.userId) {
        playerSymbol = 'X';
        game.players.X = socket.id;
      } else if (dbGame.playerO?.id === decoded.userId) {
        playerSymbol = 'O';
        game.players.O = socket.id;
      }

      const playersConnected = countPlayersInGame(gameId.toString());
      console.log(`Player ${socket.id} assigned as ${playerSymbol}, Players connected: ${playersConnected}`);
      
      if (playerSymbol && game) {
        // Update game status based on player count
        if (playersConnected === 2) {
          game.gameStatus = 'active';
          game.readyStatus = { X: true, O: true };
          game.nextPlayer = 'X';
        }
        
        // Ensure both players' information is set
        game.playerX = dbGame.playerX;
        game.playerO = dbGame.playerO;
        
        // Emit player assignment with complete game state
        socket.emit('player_assigned', { 
          player: playerSymbol, 
          playersConnected,
          readyStatus: game.readyStatus,
          gameStatus: game.gameStatus,
          winner: null,
          playerX: dbGame.playerX,
          playerO: dbGame.playerO
        });
        
        // Broadcast updated state to all players immediately
        const gameUpdate = {
          id: gameId,
          squares: game.squares,
          nextPlayer: game.nextPlayer,
          gameStatus: game.gameStatus,
          winner: game.winner,
          readyStatus: game.readyStatus,
          players: game.players,
          playerX: dbGame.playerX,
          playerO: dbGame.playerO
        };
        
        // Send to all players in the room
        io.to(gameId.toString()).emit('game_update', gameUpdate);
        
        // Also send directly to the joining player to ensure they have the latest state
        socket.emit('game_update', gameUpdate);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('queue_error', 'Failed to join game');
      return;
    }
  });
  
  socket.on('leave_queue', () => {
    console.log(`User ${socket.id} leaving queue`);
    const index = playerQueue.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      playerQueue.splice(index, 1);
    }
  });
  
  socket.on('make_move', async ({ gameId, position, player }: { gameId: string, position: number, player: PlayerSymbol }) => {
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
    
    // Get game data from database to include player information
    const dbGame = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
      include: {
        playerX: {
          select: {
            id: true,
            username: true
          }
        },
        playerO: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
    // Broadcast the updated game state
    io.to(gameId).emit('game_update', {
      id: parseInt(gameId),
      squares: game.squares,
      nextPlayer: game.nextPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      readyStatus: game.readyStatus,
      players: game.players,
      playerX: dbGame?.playerX || null,
      playerO: dbGame?.playerO || null
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