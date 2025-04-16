import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { prisma } from '../../prisma/prisma';
import { verifyTokenAndGetUserId, verifyToken } from '../middleware/Auth';
import { Socket } from 'socket.io';
import { QueueManager } from '../controllers/QueueManager';

export abstract class BaseGameServer {
  protected io: Server;
  protected abstract getTimeLimit(): number; // Child classes must implement this
  
  private handledSockets = new WeakMap<any, boolean>();
  private static socketHandlersSetup = false;
  private static eventHandlers = new WeakMap<any, boolean>();
  private static joinedGames = new WeakMap<any, Set<number>>(); // Track which games each socket has joined

  constructor(io: Server) {
    this.io = io;
    if (!BaseGameServer.socketHandlersSetup) {
      this.setupSocketHandlers();
      BaseGameServer.socketHandlersSetup = true;
    }
  }

  // Game-specific logic to be implemented by each game
  protected abstract validateMove(game: Game, position: number, userId: string): boolean;
  protected abstract checkGameEnd(game: Game): { isEnded: boolean; winner: string | null };
  protected abstract updateGameState(game: Game, position: number, userId: string): Promise<Game>;

  protected calculateTimeRemaining(game: Game, moves: { playedAt: Date }[]): { player1Time: number; player2Time: number } {
    const timeLimit = this.getTimeLimit();
    let player1Time = timeLimit;
    let player2Time = timeLimit;
    let lastMoveTime = game.createdAt;

    // Calculate time used by each player based on their moves
    moves.forEach((move, index) => {
      const moveTime = new Date(move.playedAt).getTime();
      const lastTime = new Date(lastMoveTime).getTime();
      const timeDiff = (moveTime - lastTime) / 1000; // Convert to seconds

      // Alternate between players (first move is player 1, second is player 2, etc.)
      if (index % 2 === 0) {
        player1Time -= timeDiff;
      } else {
        player2Time -= timeDiff;
      }

      lastMoveTime = move.playedAt;
    });

    // Subtract time since last move from current player
    const currentTime = new Date().getTime();
    const lastTime = new Date(lastMoveTime).getTime();
    const timeDiff = (currentTime - lastTime) / 1000;

    if (moves.length % 2 === 0) {
      player1Time -= timeDiff;
    } else {
      player2Time -= timeDiff;
    }

    // Round to nearest second and ensure non-negative
    return {
      player1Time: Math.max(0, Math.round(player1Time)),
      player2Time: Math.max(0, Math.round(player2Time))
    };
  }

  public async handleJoinGame(userId: string, data: { gameId: number; gameType: string }) {
    try {
      const { gameId, gameType } = data;
      
      // Get the socket for this user
      const userSocket = Array.from(this.io.sockets.sockets.values()).find(
        s => s.data.userId === userId
      );

      if (!userSocket) {
        throw new Error('Socket not found');
      }

      // Check if this socket has already joined this game
      if (!BaseGameServer.joinedGames.has(userSocket)) {
        BaseGameServer.joinedGames.set(userSocket, new Set());
      }
      const socketGames = BaseGameServer.joinedGames.get(userSocket);
      if (socketGames?.has(gameId)) {
        console.log('Socket already joined this game:', { socketId: userSocket.id, userId, gameId });
        return; // Skip if already joined
      }
      socketGames?.add(gameId);
      
      // Get the game with player information and moves
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          player1: {
            select: {
              id: true,
              username: true
            }
          },
          player2: {
            select: {
              id: true,
              username: true
            }
          },
          moves: {
            orderBy: {
              playedAt: 'asc'
            }
          }
        }
      });

      if (!game) {
        throw new Error('Game not found');
      }

      // Verify the game type matches
      if (game.gameType !== gameType) {
        throw new Error(`Invalid game type. Expected ${game.gameType} but got ${gameType}`);
      }

      // Verify the user is one of the players
      if (game.player1Id !== userId && game.player2Id !== userId) {
        throw new Error('You are not a player in this game');
      }

      // Find the socket by userId
      const socket = Array.from(this.io.sockets.sockets.values()).find(
        s => s.data.userId === userId
      );

      if (socket) {
        const gameRoom = `game-${gameId}`;
        socket.join(gameRoom);

        // Get the current game state
        const gameState = await this.checkGameState(game);

        // Emit to the specific socket first
        socket.emit('game-state', gameState);
        // Then emit to the room to update all players
        this.io.to(gameRoom).emit('game-state', gameState);
      } else {
        console.error('Socket not found for userId:', userId);
        throw new Error('Socket connection not found');
      }
    } catch (error) {
      console.error('Error in handleJoinGame:', error);
      throw error;
    }
  }

  public async handleMakeMove(socket: Socket, data: { gameId: number; position: number }) {
    try {
      const { gameId, position } = data;
      const userId = socket.data.userId;

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          player1: true,
          player2: true,
          moves: {
            orderBy: {
              playedAt: 'asc'
            }
          }
        }
      });

      if (!game) {
        socket.emit('moveError', { message: 'Game not found' });
        return;
      }

      // Check if game is already ended
      if (game.state !== 'ACTIVE') {
        socket.emit('moveError', { message: 'Game has already ended' });
        return;
      }

      const isPlayer1 = game.player1Id === userId;
      const isPlayer2 = game.player2Id === userId;
      const isCurrentPlayer = (game.nextPlayer === 1 && isPlayer1) || (game.nextPlayer === 2 && isPlayer2);

      if (!isCurrentPlayer) {
        socket.emit('moveError', { message: 'Not your turn' });
        return;
      }

      // Check if player has time remaining
      const { player1Time, player2Time } = this.calculateTimeRemaining(game, game.moves);
      if ((isPlayer1 && player1Time <= 0) || (isPlayer2 && player2Time <= 0)) {
        // Update game state to reflect time-based loss
        const newState = isPlayer1 ? 'PLAYER2_WIN' : 'PLAYER1_WIN';
        const updatedGame = await prisma.game.update({
          where: { id: game.id },
          data: { state: newState }
        });

        const gameState = await this.checkGameState(updatedGame);
        const gameRoom = `game-${gameId}`;
        this.io.to(gameRoom).emit('game-state', gameState);
        
        socket.emit('moveError', { message: 'Time has run out' });
        return;
      }

      // Delegate game-specific validation and state updates to child classes
      const { isValidMove, updatedBoardState } = await this.validateAndUpdateMove(game, position, userId);

      if (!isValidMove) {
        socket.emit('moveError', { message: 'Invalid move' });
        return;
      }

      const updatedGame = await this.updateGameState(game, position, userId);
      
      const gameState = await this.checkGameState(updatedGame);
      
      const gameRoom = `game-${gameId}`;
      this.io.to(gameRoom).emit('game-state', gameState);

    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('moveError', { message: 'Error processing move' });
    }
  }

  // Setup socket event handlers
  public setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection in BaseGameServer:', socket.id);

      // Get the JWT token from the handshake
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('No token provided for socket:', socket.id);
        socket.emit('error', 'No authentication token provided');
        return;
      }

      // Verify token and get userId
      const userId = verifyTokenAndGetUserId(token);
      if (!userId) {
        console.log('Invalid token for socket:', socket.id);
        socket.emit('error', 'Invalid token');
        return;
      }

      // Set the userId in the socket's handshake auth object
      socket.handshake.auth.userId = userId;
      socket.data.userId = userId; // Also set it in socket.data for easier access

      console.log('Socket authenticated in BaseGameServer:', { socketId: socket.id, userId });

      // Handle queue events
      if (!BaseGameServer.eventHandlers.has(socket)) {
        BaseGameServer.eventHandlers.set(socket, true);

        socket.on('join-queue', async (data: { gameType: 'tictactoe' | 'connect4', token: string }) => {
          try {
            console.log('Received join-queue event in BaseGameServer:', { socketId: socket.id, userId, gameType: data.gameType });
            const decoded = await verifyToken(data.token);
            if (!decoded) {
              console.log('Invalid queue token for socket:', socket.id);
              socket.emit('error', { message: 'Invalid token' });
              return;
            }

            // Get user info from database
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { id: true, username: true }
            });

            if (!user) {
              console.log('User not found for queue join:', { socketId: socket.id, userId: decoded.userId });
              socket.emit('error', { message: 'User not found' });
              return;
            }

            await QueueManager.getInstance(this.io).joinQueue(socket, user.id, user.username, data.gameType);
            console.log('User joined queue in BaseGameServer:', { socketId: socket.id, userId: user.id, username: user.username, gameType: data.gameType });
          } catch (error) {
            console.error('Error joining queue in BaseGameServer:', { socketId: socket.id, userId, error });
            socket.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
          }
        });

        socket.on('leave-queue', (data: { gameType: 'tictactoe' | 'connect4' }) => {
          console.log('Received leave-queue event in BaseGameServer:', { socketId: socket.id, userId, gameType: data.gameType });
          QueueManager.getInstance(this.io).leaveQueue(socket.id, data.gameType);
        });

        // Handle game events
        socket.on('joinGame', (data) => {
          console.log('Received joinGame event in BaseGameServer:', { socketId: socket.id, userId, gameId: data.gameId });
          this.handleJoinGame(userId, data).catch(error => {
            console.error('Error in joinGame handler in BaseGameServer:', { socketId: socket.id, userId, error });
            socket.emit('error', error.message);
          });
        });

        socket.on('makeMove', (data) => {
          console.log('Received makeMove event in BaseGameServer:', { socketId: socket.id, userId, gameId: data.gameId, position: data.position });
          this.handleMakeMove(socket, data).catch(error => {
            console.error('Error in makeMove handler in BaseGameServer:', { socketId: socket.id, userId, error });
            socket.emit('error', error.message);
          });
        });

        // Clean up on disconnect
        socket.on('disconnect', () => {
          console.log('Socket disconnected in BaseGameServer:', { socketId: socket.id, userId });
          // Remove from all queues on disconnect
          QueueManager.getInstance(this.io).leaveQueue(socket.id, 'tictactoe');
          QueueManager.getInstance(this.io).leaveQueue(socket.id, 'connect4');
          this.handledSockets.delete(socket);
          BaseGameServer.eventHandlers.delete(socket);
          BaseGameServer.joinedGames.delete(socket); // Clean up joined games tracking
        });
      }
    });

    // Set up periodic game state check
    setInterval(async () => {
      try {
        // Get all active games
        const activeGames = await prisma.game.findMany({
          where: {
            state: 'ACTIVE'
          },
          include: {
            moves: {
              orderBy: {
                playedAt: 'asc'
              }
            },
            player1: true,
            player2: true
          }
        });

        // Check each game for time expiration
        for (const game of activeGames) {
          const { player1Time, player2Time } = this.calculateTimeRemaining(game, game.moves);
          
          // If either player has run out of time, update and emit game state
          if (player1Time <= 0 || player2Time <= 0) {
            console.log('Time expired detected:', {
              gameId: game.id,
              player1Time,
              player2Time
            });

            // Update the game state in the database
            const newState = player1Time <= 0 ? 'PLAYER2_WIN' : 'PLAYER1_WIN';
            const updatedGame = await prisma.game.update({
              where: { id: game.id },
              data: { state: newState }
            });

            // Get the updated game state
            const gameState = await this.checkGameState(updatedGame);
            const gameRoom = `game-${game.id}`;
            
            // Emit the game state to all players with explicit end game flags
            this.io.to(gameRoom).emit('game-state', {
              ...gameState,
              state: newState,
              isActive: false,
              isEnded: true,
              winner: newState === 'PLAYER1_WIN' ? game.player1Id : game.player2Id,
              player1Time: Math.max(0, player1Time),
              player2Time: Math.max(0, player2Time)
            });
            
            console.log('Time expired - Game ended:', {
              gameId: game.id,
              winner: newState === 'PLAYER1_WIN' ? game.player1Id : game.player2Id,
              loser: newState === 'PLAYER1_WIN' ? game.player2Id : game.player1Id,
              gameState: {
                ...gameState,
                state: newState,
                isActive: false,
                isEnded: true,
                winner: newState === 'PLAYER1_WIN' ? game.player1Id : game.player2Id,
                player1Time: Math.max(0, player1Time),
                player2Time: Math.max(0, player2Time)
              }
            });
          }
        }
      } catch (error) {
        console.error('Error in periodic game state check:', error);
      }
    }, 1000); // Check every second
  }

  // Abstract methods to be implemented by child classes
  protected abstract validateAndUpdateMove(game: Game, position: number, userId: string): Promise<{ isValidMove: boolean; updatedBoardState: any }>;
  protected abstract checkGameState(game: Game): Promise<{
    isActive: boolean;
    isEnded: boolean;
    winner: string | null;
    isDraw: boolean;
    boardState: any;
    currentPlayer: string;
    player1Time: number;
    player2Time: number;
  }>;
} 