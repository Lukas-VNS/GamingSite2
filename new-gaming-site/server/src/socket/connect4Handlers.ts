import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { checkConnect4Winner, isConnect4Draw, getLowestEmptyPosition } from '../game/gameLogic';
import { PlayerSymbol, GameStatus } from '../types';
import { verifyToken } from '../middleware/auth';
import { createGame, updateGame, getGame } from '../services/gameService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Separate queue for Connect 4
const connect4Queue: Array<{ socketId: string; userId: string }> = [];

// Global timer check interval
let timerCheckInterval: NodeJS.Timeout | null = null;

// Function to check and handle time expiration
async function checkTimeExpiration(io: Server, gameId: number) {
  try {
    const game = await prisma.connect4Game.findUnique({
      where: { id: gameId },
      include: {
        playerRed: true,
        playerYellow: true
      }
    });

    if (!game || game.gameStatus !== 'active') return;

    const now = new Date();
    const timeElapsed = Math.floor((now.getTime() - game.lastMoveTimestamp.getTime()) / 1000);
    
    console.log('[TIME_CHECK] Checking time for game:', {
      gameId,
      nextPlayer: game.nextPlayer,
      timeElapsed,
      playerRedTimeRemaining: game.playerRedTimeRemaining,
      playerYellowTimeRemaining: game.playerYellowTimeRemaining
    });
    
    // Check if current player's time has expired
    if (game.nextPlayer === 'red' && game.playerRedTimeRemaining <= timeElapsed) {
      console.log('[TIME_EXPIRED] Player Red ran out of time');
      const updatedGame = await prisma.connect4Game.update({
        where: { id: gameId },
        data: {
          gameStatus: 'ended',
          winner: 'yellow',
          playerRedTimeRemaining: 0,
          playerYellowTimeRemaining: game.playerYellowTimeRemaining,
          lastMoveTimestamp: now
        },
        include: {
          playerRed: true,
          playerYellow: true
        }
      });

      // Emit a specific time expired event
      io.to(`game:${gameId}`).emit('time_expired', {
        gameId,
        winner: 'yellow',
        loser: 'red',
        message: ''
      });

      // Also emit the game update
      io.to(`game:${gameId}`).emit('game_update', {
        id: updatedGame.id,
        board: updatedGame.board as Array<Array<PlayerSymbol | null>>,
        nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
        gameStatus: updatedGame.gameStatus as GameStatus,
        winner: updatedGame.winner as PlayerSymbol | null,
        playerRed: updatedGame.playerRed,
        playerYellow: updatedGame.playerYellow,
        playerRedId: updatedGame.playerRedId,
        playerYellowId: updatedGame.playerYellowId,
        lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
        playerRedTimeRemaining: updatedGame.playerRedTimeRemaining,
        playerYellowTimeRemaining: updatedGame.playerYellowTimeRemaining
      });
    } else if (game.nextPlayer === 'yellow' && game.playerYellowTimeRemaining <= timeElapsed) {
      console.log('[TIME_EXPIRED] Player Yellow ran out of time');
      const updatedGame = await prisma.connect4Game.update({
        where: { id: gameId },
        data: {
          gameStatus: 'ended',
          winner: 'red',
          playerRedTimeRemaining: game.playerRedTimeRemaining,
          playerYellowTimeRemaining: 0,
          lastMoveTimestamp: now
        },
        include: {
          playerRed: true,
          playerYellow: true
        }
      });

      // Emit a specific time expired event
      io.to(`game:${gameId}`).emit('time_expired', {
        gameId,
        winner: 'red',
        loser: 'yellow',
        message: ''
      });

      // Also emit the game update
      io.to(`game:${gameId}`).emit('game_update', {
        id: updatedGame.id,
        board: updatedGame.board as Array<Array<PlayerSymbol | null>>,
        nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
        gameStatus: updatedGame.gameStatus as GameStatus,
        winner: updatedGame.winner as PlayerSymbol | null,
        playerRed: updatedGame.playerRed,
        playerYellow: updatedGame.playerYellow,
        playerRedId: updatedGame.playerRedId,
        playerYellowId: updatedGame.playerYellowId,
        lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
        playerRedTimeRemaining: updatedGame.playerRedTimeRemaining,
        playerYellowTimeRemaining: updatedGame.playerYellowTimeRemaining
      });
    }
  } catch (error) {
    console.error('[TIME_EXPIRED] Error checking time expiration:', error);
  }
}

// Initialize the global timer check if it hasn't been initialized yet
function initializeTimerCheck(io: Server) {
  if (!timerCheckInterval) {
    console.log('[TIMER_CHECK] Initializing global timer check');
    timerCheckInterval = setInterval(async () => {
      try {
        const activeGames = await prisma.connect4Game.findMany({
          where: { gameStatus: 'active' },
          select: { id: true }
        });

        console.log(`[TIMER_CHECK] Checking ${activeGames.length} active games`);
        for (const game of activeGames) {
          await checkTimeExpiration(io, game.id);
        }
      } catch (error) {
        console.error('[TIMER_CHECK] Error checking active games:', error);
      }
    }, 1000); // Check every second
  }
}

export const setupConnect4Handlers = async (io: Server, socket: Socket) => {
  logger.info('[CONNECT4] New socket connection:', socket.id);

  try {
    // Initialize the timer check if it hasn't been initialized yet
    initializeTimerCheck(io);

    const token = socket.handshake.auth.token;
    if (!token) {
      logger.error('[CONNECT4] No token provided for socket:', socket.id);
      socket.disconnect();
      return;
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      logger.error('[CONNECT4] Invalid token for socket:', socket.id);
      socket.disconnect();
      return;
    }

    logger.info('[CONNECT4] Socket authenticated:', socket.id, 'User:', decoded.userId);

    socket.on('join_queue', async ({ gameType }) => {
      try {
        if (gameType !== 'connect4') {
          logger.error('[CONNECT4] Invalid game type:', gameType);
          socket.emit('error', { message: 'Invalid game type' });
          return;
        }

        const existingInQueue = connect4Queue.find(q => q.socketId === socket.id);
        if (existingInQueue) {
          logger.warn('[CONNECT4] Socket already in queue:', socket.id);
          return;
        }

        logger.info('[CONNECT4] Adding socket to queue:', socket.id);
        connect4Queue.push({ socketId: socket.id, userId: decoded.userId });

        // Send queue joined event to the player
        socket.emit('queue_joined', { message: 'You have been added to the queue' });

        if (connect4Queue.length >= 2) {
          const [player1, player2] = connect4Queue.splice(0, 2);
          logger.info('[CONNECT4] Creating new game with players:', {
            player1: player1.userId,
            player2: player2.userId
          });

          // Get socket instances
          const player1Socket = io.sockets.sockets.get(player1.socketId);
          const player2Socket = io.sockets.sockets.get(player2.socketId);

          if (!player1Socket || !player2Socket) {
            logger.error('[CONNECT4] One or both players disconnected');
            return;
          }

          const game = await createGame({
            playerRedId: player1.userId,
            playerYellowId: player2.userId,
            gameStatus: 'waiting',
            board: Array(6).fill(null).map(() => Array(7).fill(null)),
            nextPlayer: 'red',
            playerRedTimeRemaining: 60,
            playerYellowTimeRemaining: 60
          });

          logger.info('[CONNECT4] Game created:', game.id);

          // Assign players and send initial game state
          player1Socket.emit('player_assigned', { player: 'red', gameState: game });
          player2Socket.emit('player_assigned', { player: 'yellow', gameState: game });

          // Join game room
          player1Socket.join(`game:${game.id}`);
          player2Socket.join(`game:${game.id}`);

          // Start game after 5 seconds
          setTimeout(async () => {
            try {
              const updatedGame = await updateGame(game.id, { gameStatus: 'active' });
              io.to(`game:${game.id}`).emit('game_update', updatedGame);
              logger.info('[CONNECT4] Game started:', game.id);
            } catch (error) {
              logger.error('[CONNECT4] Error starting game:', error);
              io.to(`game:${game.id}`).emit('error', { message: 'Failed to start game' });
            }
          }, 5000);
        }
      } catch (error) {
        logger.error('[CONNECT4] Error in join_queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    socket.on('join_game', async ({ gameId }) => {
      try {
        logger.info('[CONNECT4] Socket joining game:', socket.id, 'Game:', gameId);
        const game = await getGame(gameId);
        
        if (!game) {
          logger.error('[CONNECT4] Game not found:', gameId);
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.playerRedId !== decoded.userId && game.playerYellowId !== decoded.userId) {
          logger.error('[CONNECT4] User not a player in game:', {
            userId: decoded.userId,
            gameId,
            playerRedId: game.playerRedId,
            playerYellowId: game.playerYellowId
          });
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        const player = game.playerRedId === decoded.userId ? 'red' : 'yellow';
        socket.join(`game:${gameId}`);
        socket.emit('player_assigned', { player, gameState: game });
        logger.info('[CONNECT4] Player assigned to game:', {
          socketId: socket.id,
          gameId,
          player,
          userId: decoded.userId
        });
      } catch (error) {
        logger.error('[CONNECT4] Error in join_game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('make_move', async ({ gameId, column }) => {
      try {
        logger.info('[CONNECT4] Move received:', {
          socketId: socket.id,
          gameId,
          column,
          userId: decoded.userId
        });

        const game = await getGame(gameId);
        if (!game) {
          logger.error('[CONNECT4] Game not found:', gameId);
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.gameStatus !== 'active') {
          logger.warn('[CONNECT4] Game not active:', gameId);
          socket.emit('error', { message: 'Game is not active' });
          return;
        }

        const currentPlayer = game.nextPlayer;
        if ((currentPlayer === 'red' && game.playerRedId !== decoded.userId) ||
            (currentPlayer === 'yellow' && game.playerYellowId !== decoded.userId)) {
          logger.warn('[CONNECT4] Not player\'s turn:', {
            currentPlayer,
            userId: decoded.userId,
            gameId
          });
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        const row = getLowestEmptyPosition(game.board, column);
        if (row === -1) {
          logger.warn('[CONNECT4] Column full:', { gameId, column });
          socket.emit('error', { message: 'Column is full' });
          return;
        }

        const newBoard = [...game.board];
        newBoard[row][column] = currentPlayer;

        const winner = checkConnect4Winner(newBoard);
        const gameStatus = winner ? 'ended' : 'active';
        const nextPlayer = currentPlayer === 'red' ? 'yellow' : 'red';

        // Calculate time elapsed since last move
        const now = new Date();
        const lastMoveTime = new Date(game.lastMoveTimestamp);
        const timeElapsed = Math.floor((now.getTime() - lastMoveTime.getTime()) / 1000);
        
        logger.info('[CONNECT4] Time tracking:', {
          gameId,
          player: currentPlayer,
          lastMoveTimestamp: game.lastMoveTimestamp,
          currentTimestamp: now.toISOString(),
          timeElapsed,
          playerRedTimeRemaining: game.playerRedTimeRemaining,
          playerYellowTimeRemaining: game.playerYellowTimeRemaining
        });

        // Update time remaining based on the player who just moved
        const updatedGame = await updateGame(gameId, {
          board: newBoard,
          nextPlayer,
          gameStatus,
          winner,
          lastMoveTimestamp: now.toISOString(),
          // Update time remaining based on the player who just moved
          playerRedTimeRemaining: currentPlayer === 'red' 
            ? Math.max(0, game.playerRedTimeRemaining - timeElapsed) 
            : game.playerRedTimeRemaining,
          playerYellowTimeRemaining: currentPlayer === 'yellow' 
            ? Math.max(0, game.playerYellowTimeRemaining - timeElapsed) 
            : game.playerYellowTimeRemaining
        });

        logger.info('[CONNECT4] Updated game state:', {
          gameId,
          player: currentPlayer,
          timeElapsed,
          playerRedTimeRemaining: updatedGame.playerRedTimeRemaining,
          playerYellowTimeRemaining: updatedGame.playerYellowTimeRemaining,
          lastMoveTimestamp: updatedGame.lastMoveTimestamp,
          nextPlayer: updatedGame.nextPlayer
        });

        io.to(`game:${gameId}`).emit('game_update', updatedGame);
        logger.info('[CONNECT4] Move processed:', {
          gameId,
          row,
          column,
          player: currentPlayer,
          winner,
          gameStatus
        });
      } catch (error) {
        logger.error('[CONNECT4] Error in make_move:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    socket.on('disconnect', () => {
      logger.info('[CONNECT4] Socket disconnected:', socket.id);
      const queueIndex = connect4Queue.findIndex(q => q.socketId === socket.id);
      if (queueIndex !== -1) {
        connect4Queue.splice(queueIndex, 1);
      }
    });
  } catch (error) {
    logger.error('[CONNECT4] Error in socket connection:', error);
    socket.disconnect();
  }
}; 