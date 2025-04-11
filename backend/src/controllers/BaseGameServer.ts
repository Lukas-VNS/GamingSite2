import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { prisma } from '../../prisma/prisma';
import { verifyTokenAndGetUserId } from '../middleware/Auth';
import { Socket } from 'socket.io';

export abstract class BaseGameServer {
  protected io: Server;
  
  constructor(io: Server) {
    this.io = io;
  }

  // Game-specific logic to be implemented by each game
  protected abstract validateMove(game: Game, position: number, userId: string): boolean;
  protected abstract checkGameEnd(game: Game): { isEnded: boolean; winner: string | null };
  protected abstract updateGameState(game: Game, position: number, userId: string): Promise<Game>;

  public async handleJoinGame(userId: string, data: { gameId: number; gameType: string }) {
    try {
      const { gameId } = data;
      
      // Get the game with player information
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

        // Send the initial game state to the player
        const gameState = {
          state: game.state,
          nextPlayer: game.nextPlayer,
          boardState: game.boardState,
          player1Id: game.player1Id,
          player2Id: game.player2Id,
          player1: game.player1 ? {
            id: game.player1.id,
            username: game.player1.username
          } : null,
          player2: game.player2 ? {
            id: game.player2.id,
            username: game.player2.username
          } : null
        };

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
          moves: true
        }
      });

      if (!game || !game.boardState) {
        socket.emit('moveError', { message: 'Game not found' });
        return;
      }

      const isPlayer1 = game.player1Id === userId;
      const isPlayer2 = game.player2Id === userId;
      const isCurrentPlayer = (game.nextPlayer === 1 && isPlayer1) || (game.nextPlayer === 2 && isPlayer2);

      if (!isCurrentPlayer) {
        socket.emit('moveError', { message: 'Not your turn' });
        return;
      }

      // Delegate game-specific validation and state updates to child classes
      const { isValidMove, updatedBoardState } = await this.validateAndUpdateMove(game, position, userId);

      if (!isValidMove) {
        socket.emit('moveError', { message: 'Invalid move' });
        return;
      }

      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          boardState: updatedBoardState,
          nextPlayer: game.nextPlayer === 1 ? 2 : 1
        },
        include: {
          player1: true,
          player2: true,
          moves: true
        }
      });

      const gameState = await this.checkGameState(updatedGame);
      
      const gameRoom = `game-${gameId}`;
      this.io.to(gameRoom).emit('game-state', {
        ...gameState,
        player1Id: updatedGame.player1Id,
        player2Id: updatedGame.player2Id,
        player1: {
          id: updatedGame.player1Id,
          username: updatedGame.player1?.username || 'Waiting for player...'
        },
        player2: {
          id: updatedGame.player2Id,
          username: updatedGame.player2?.username || 'Waiting for player...'
        },
        boardState: updatedGame.boardState,
        state: updatedGame.state,
        nextPlayer: updatedGame.nextPlayer
      });

    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('moveError', { message: 'Error processing move' });
    }
  }

  // Setup socket event handlers
  public setupSocketHandlers() {
    this.io.on('connection', (socket) => {
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
    });
  }

  // Abstract methods to be implemented by child classes
  protected abstract validateAndUpdateMove(game: any, position: number, userId: string): Promise<{ isValidMove: boolean; updatedBoardState: any }>;
  protected abstract checkGameState(game: any): Promise<{
    isActive: boolean;
    isEnded: boolean;
    winner: string | null;
    isDraw: boolean;
    boardState: any;
    currentPlayer: string;
  }>;
} 