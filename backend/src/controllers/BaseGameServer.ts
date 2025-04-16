import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { prisma } from '../../prisma/prisma';
import { verifyTokenAndGetUserId } from '../middleware/Auth';
import { Socket } from 'socket.io';

export abstract class BaseGameServer {
  protected io: Server;
  protected abstract getTimeLimit(): number; // Child classes must implement this
  
  private handledSockets = new WeakMap<any, boolean>();

  constructor(io: Server) {
    this.io = io;
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
      const { gameId } = data;
      
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

        // Send the initial game state to the player
        console.log('Emitting initial game state:', gameState);
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
      // Skip if we've already handled this socket
      if (this.handledSockets.has(socket)) {
        return;
      }
      this.handledSockets.set(socket, true);

      // Get the JWT token from the handshake
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.emit('error', 'No authentication token provided');
        return;
      }

      // Verify token and get userId
      const userId = verifyTokenAndGetUserId(token);
      if (!userId) {
        socket.emit('error', 'Invalid token');
        return;
      }

      // Set the userId in the socket's handshake auth object
      socket.handshake.auth.userId = userId;
      socket.data.userId = userId; // Also set it in socket.data for easier access

      console.log('Socket connected with userId:', userId);

      // Now we can use the verified userId for their events
      socket.on('joinGame', (data) => {
        console.log('Received joinGame event:', data);
        this.handleJoinGame(userId, data).catch(error => {
          console.error('Error in joinGame handler:', error);
          socket.emit('error', error.message);
        });
      });

      socket.on('makeMove', (data) => {
        console.log('Received makeMove event:', data);
        this.handleMakeMove(socket, data).catch(error => {
          console.error('Error in makeMove handler:', error);
          socket.emit('error', error.message);
        });
      });

      // Clean up on disconnect
      socket.on('disconnect', () => {
        this.handledSockets.delete(socket);
      });
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