import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { calculateWinner as calculateTicTacToeWinner, isDraw as isTicTacToeDraw } from '../game/gameLogic';
import { PlayerSymbol, GameStatus } from '../types';
import { verifyToken } from '../middleware/auth';
import { createGame, updateGame, getGame } from '../services/gameService';
import { queueService } from '../services/queueService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Global timer check interval
let timerCheckInterval: NodeJS.Timeout | null = null;

// Function to check and handle time expiration
async function checkTimeExpiration(io: Server, gameId: number) {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        playerX: true,
        playerO: true
      }
    });

    if (!game || game.gameStatus !== 'active') return;

    const now = new Date();
    const timeElapsed = Math.floor((now.getTime() - game.lastMoveTimestamp.getTime()) / 1000);
    
    console.log('[TIME_CHECK] Checking time for game:', {
      gameId,
      nextPlayer: game.nextPlayer,
      timeElapsed,
      playerXTimeRemaining: game.playerXTimeRemaining,
      playerOTimeRemaining: game.playerOTimeRemaining
    });
    
    // Check if current player's time has expired
    if (game.nextPlayer === 'X' && game.playerXTimeRemaining <= timeElapsed) {
      console.log('[TIME_EXPIRED] Player X ran out of time');
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          gameStatus: 'ended',
          winner: 'O',
          playerXTimeRemaining: 0,
          playerOTimeRemaining: game.playerOTimeRemaining,
          lastMoveTimestamp: now
        },
        include: {
          playerX: true,
          playerO: true
        }
      });

      // Emit a specific time expired event
      io.to(`game:${gameId}`).emit('time_expired', {
        gameId,
        winner: 'O',
        loser: 'X',
        message: 'Player X ran out of time! Player O wins!'
      });

      // Also emit the game update
      io.to(`game:${gameId}`).emit('game_update', {
        id: updatedGame.id,
        squares: updatedGame.squares as Array<PlayerSymbol | null>,
        nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
        gameStatus: updatedGame.gameStatus as GameStatus,
        winner: updatedGame.winner as PlayerSymbol | null,
        playerX: updatedGame.playerX,
        playerO: updatedGame.playerO,
        playerXId: updatedGame.playerXId,
        playerOId: updatedGame.playerOId,
        lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
        playerXTimeRemaining: updatedGame.playerXTimeRemaining,
        playerOTimeRemaining: updatedGame.playerOTimeRemaining
      });
    } else if (game.nextPlayer === 'O' && game.playerOTimeRemaining <= timeElapsed) {
      console.log('[TIME_EXPIRED] Player O ran out of time');
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          gameStatus: 'ended',
          winner: 'X',
          playerXTimeRemaining: game.playerXTimeRemaining,
          playerOTimeRemaining: 0,
          lastMoveTimestamp: now
        },
        include: {
          playerX: true,
          playerO: true
        }
      });

      // Emit a specific time expired event
      io.to(`game:${gameId}`).emit('time_expired', {
        gameId,
        winner: 'X',
        loser: 'O',
        message: 'Player O ran out of time! Player X wins!'
      });

      // Also emit the game update
      io.to(`game:${gameId}`).emit('game_update', {
        id: updatedGame.id,
        squares: updatedGame.squares as Array<PlayerSymbol | null>,
        nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
        gameStatus: updatedGame.gameStatus as GameStatus,
        winner: updatedGame.winner as PlayerSymbol | null,
        playerX: updatedGame.playerX,
        playerO: updatedGame.playerO,
        playerXId: updatedGame.playerXId,
        playerOId: updatedGame.playerOId,
        lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
        playerXTimeRemaining: updatedGame.playerXTimeRemaining,
        playerOTimeRemaining: updatedGame.playerOTimeRemaining
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
        const activeGames = await prisma.game.findMany({
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

export async function setupTicTacToeHandlers(io: Server, socket: Socket) {
  logger.info('[TICTACTOE] New socket connection:', socket.id);

  try {
    // Initialize the timer check if it hasn't been initialized yet
    initializeTimerCheck(io);

    const token = socket.handshake.auth.token;
    if (!token) {
      logger.error('[TICTACTOE] No token provided for socket:', socket.id);
      socket.disconnect();
      return;
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      logger.error('[TICTACTOE] Invalid token for socket:', socket.id);
      socket.disconnect();
      return;
    }

    logger.info('[TICTACTOE] Socket authenticated:', socket.id, 'User:', decoded.userId);

    socket.on('join_queue', async ({ gameType }) => {
      try {
        if (gameType !== 'tic-tac-toe') {
          logger.error('[TICTACTOE] Invalid game type:', gameType);
          socket.emit('error', { message: 'Invalid game type' });
          return;
        }

        // Add to queue using the queue service
        queueService.addToQueue({
          socketId: socket.id,
          userId: decoded.userId,
          gameType: 'tic-tac-toe'
        });

        // Send queue joined event to the player
        socket.emit('queue_joined', { message: 'You have been added to the queue' });

        // Check for waiting players
        const waitingPlayers = queueService.getWaitingPlayers('tic-tac-toe');
        if (waitingPlayers.length >= 2) {
          const [player1, player2] = waitingPlayers;
          logger.info('[TICTACTOE] Creating new game with players:', {
            player1: player1.userId,
            player2: player2.userId
          });

          // Remove players from queue
          queueService.removePlayersFromQueue([player1.userId, player2.userId]);

          // Verify both players are still connected
          const player1Socket = io.sockets.sockets.get(player1.socketId);
          const player2Socket = io.sockets.sockets.get(player2.socketId);

          if (!player1Socket || !player2Socket) {
            logger.error('[TICTACTOE] One or both players disconnected');
            return;
          }

          const game = await prisma.game.create({
            data: {
              squares: Array(9).fill(null),
              nextPlayer: 'X',
              gameStatus: 'waiting',
              playerXId: player1.userId,
              playerOId: player2.userId,
              lastMoveTimestamp: new Date(),
              playerXTimeRemaining: 60,
              playerOTimeRemaining: 60
            },
            include: {
              playerX: true,
              playerO: true
            }
          });

          // Make sure both players are in their user rooms
          player1Socket.join(`user:${player1.userId}`);
          player2Socket.join(`user:${player2.userId}`);

          // Emit game creation event to both players
          io.to(`user:${player1.userId}`).emit('game_created', {
            gameId: game.id,
            gameType: 'tic-tac-toe'
          });

          io.to(`user:${player2.userId}`).emit('game_created', {
            gameId: game.id,
            gameType: 'tic-tac-toe'
          });
        }
      } catch (error) {
        logger.error('[TICTACTOE] Error in join_queue:', error);
        socket.emit('error', { message: 'Failed to join queue' });
      }
    });

    socket.on('join_game', async (data: { gameId: number }) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error('[TICTACTOE] No auth token provided for join_game');
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const userId = decoded.userId;

        console.log(`[TICTACTOE] User ${userId} joining game ${data.gameId}`);

        const ticTacToeGame = await prisma.game.findUnique({
          where: { id: data.gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (!ticTacToeGame) {
          console.error('[TICTACTOE] Game not found:', data.gameId);
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Join the game room
        socket.join(`game:${data.gameId}`);

        // Determine if this is the first or second player
        const isFirstPlayer = !ticTacToeGame.playerXReady && !ticTacToeGame.playerOReady;
        const isPlayerX = ticTacToeGame.playerXId === userId;
        const readyField = isPlayerX ? 'playerXReady' : 'playerOReady';
        const playerSymbol = isPlayerX ? 'X' : 'O';

        if (isFirstPlayer) {
          console.log('[JOIN_GAME] First player joining, updating lastMoveTimestamp');
          await prisma.game.update({
            where: { id: data.gameId },
            data: {
              lastMoveTimestamp: new Date()
            }
          });
        }

        console.log('[JOIN_GAME] Updating ready status:', {
          isPlayerX,
          readyField,
          playerSymbol,
          userId
        });

        await prisma.game.update({
          where: { id: data.gameId },
          data: {
            [readyField]: true
          }
        });

        // Check if both players are ready
        const updatedGame = await prisma.game.findUnique({
          where: { id: data.gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (updatedGame && updatedGame.playerXReady && updatedGame.playerOReady) {
          console.log('[JOIN_GAME] Both players ready, initializing game');
          
          if (updatedGame.gameStatus === 'waiting') {
            const now = new Date();
            console.log('[JOIN_GAME] Initializing game with timestamp:', now.toISOString());
            
            const initializedGame = await prisma.game.update({
              where: { id: data.gameId },
              data: {
                gameStatus: 'active',
                nextPlayer: 'X',
                squares: Array(9).fill(null),
                winner: null,
                lastMoveTimestamp: now,
                playerXTimeRemaining: 60,
                playerOTimeRemaining: 60
              },
              include: {
                playerX: true,
                playerO: true
              }
            });

            console.log('[JOIN_GAME] Game initialized:', {
              gameId: data.gameId,
              gameStatus: initializedGame.gameStatus,
              nextPlayer: initializedGame.nextPlayer,
              squares: initializedGame.squares,
              playerXTimeRemaining: initializedGame.playerXTimeRemaining,
              playerOTimeRemaining: initializedGame.playerOTimeRemaining,
              lastMoveTimestamp: initializedGame.lastMoveTimestamp.toISOString()
            });

            // Send initial game state to both players
            const gameState = {
              id: initializedGame.id,
              squares: initializedGame.squares as Array<PlayerSymbol | null>,
              nextPlayer: initializedGame.nextPlayer as PlayerSymbol,
              gameStatus: initializedGame.gameStatus as GameStatus,
              winner: initializedGame.winner as PlayerSymbol | null,
              playerX: initializedGame.playerX,
              playerO: initializedGame.playerO,
              playerXId: initializedGame.playerXId,
              playerOId: initializedGame.playerOId,
              lastMoveTimestamp: initializedGame.lastMoveTimestamp.toISOString(),
              playerXTimeRemaining: initializedGame.playerXTimeRemaining,
              playerOTimeRemaining: initializedGame.playerOTimeRemaining
            };

            io.to(`game:${data.gameId}`).emit('game_update', gameState);
          }

          const finalGame = await prisma.game.findUnique({
            where: { id: data.gameId },
            include: {
              playerX: true,
              playerO: true
            }
          });

          if (finalGame) {
            const gameState = {
              id: finalGame.id,
              squares: finalGame.squares as Array<PlayerSymbol | null>,
              nextPlayer: finalGame.nextPlayer as PlayerSymbol,
              gameStatus: finalGame.gameStatus as GameStatus,
              winner: finalGame.winner as PlayerSymbol | null,
              playerX: finalGame.playerX,
              playerO: finalGame.playerO,
              playerXId: finalGame.playerX.id,
              playerOId: finalGame.playerO.id,
              lastMoveTimestamp: finalGame.lastMoveTimestamp.toISOString(),
              playerXTimeRemaining: finalGame.playerXTimeRemaining,
              playerOTimeRemaining: finalGame.playerOTimeRemaining
            };

            // Re-emit player assignments
            const roomSockets = await io.in(`game:${data.gameId}`).fetchSockets();
            for (const sock of roomSockets) {
              const sockUserId = jwt.verify(sock.handshake.auth.token, process.env.JWT_SECRET!) as { userId: string };
              const isX = sockUserId.userId === finalGame.playerXId;
              sock.emit('player_assigned', { 
                player: isX ? 'X' : 'O' as PlayerSymbol, 
                gameState 
              });
            }

            io.to(`game:${data.gameId}`).emit('game_update', gameState);
          }
        }
      } catch (error) {
        console.error('[JOIN_GAME] Error:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('make_move', async (data: { gameId: number; position: number; player: PlayerSymbol }) => {
      try {
        const { gameId, position, player } = data;
        const token = socket.handshake.auth.token;
        
        if (!token) {
          console.error('No auth token provided for move');
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const userId = decoded.userId;

        console.log('Received Tic Tac Toe move:', { gameId, position, player, userId });

        const ticTacToeGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (!ticTacToeGame) {
          console.error('Tic Tac Toe game not found:', gameId);
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Handle Tic Tac Toe move
        if (position === undefined || position < 0 || position >= 9) {
          console.error('Invalid position for Tic Tac Toe:', position);
          socket.emit('error', { message: 'Invalid position' });
          return;
        }

        // Check if game is already ended
        if (ticTacToeGame.gameStatus === 'ended' || ticTacToeGame.gameStatus === 'draw') {
          console.error('Game is already over:', ticTacToeGame.gameStatus);
          socket.emit('error', { message: 'Game is already over' });
          return;
        }

        // Validate that the move is made by the correct player
        if ((player === 'X' && ticTacToeGame.playerXId !== userId) || 
            (player === 'O' && ticTacToeGame.playerOId !== userId)) {
          console.error('Invalid player making move:', { player, userId });
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        // Validate that it's the player's turn
        if (ticTacToeGame.nextPlayer !== player) {
          console.error('Not player\'s turn:', { nextPlayer: ticTacToeGame.nextPlayer, player });
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        // Get the current board state
        const squares = ticTacToeGame.squares as Array<PlayerSymbol | null>;
        if (squares[position]) {
          console.error('Invalid move:', { position, square: squares[position] });
          socket.emit('error', { message: 'Invalid move' });
          return;
        }

        // Make the move
        squares[position] = player;
        const nextPlayer = player === 'X' ? 'O' : 'X';

        // Check for winner or draw
        const winner = calculateTicTacToeWinner(squares);
        const isGameDraw = !winner && squares.every(square => square !== null);

        // Update game state
        const now = new Date();
        const timeElapsed = Math.floor((now.getTime() - ticTacToeGame.lastMoveTimestamp.getTime()) / 1000);
        console.log('[MAKE_MOVE] Time tracking:', {
          gameId,
          player,
          lastMoveTimestamp: ticTacToeGame.lastMoveTimestamp.toISOString(),
          currentTimestamp: now.toISOString(),
          timeElapsed,
          playerXTimeRemaining: ticTacToeGame.playerXTimeRemaining,
          playerOTimeRemaining: ticTacToeGame.playerOTimeRemaining
        });

        const updatedGame = await prisma.game.update({
          where: { id: gameId },
          data: {
            squares,
            nextPlayer,
            gameStatus: winner ? 'ended' : isGameDraw ? 'draw' : 'active',
            winner: winner || null,
            lastMoveTimestamp: now,
            // Update time remaining based on the player who just moved
            playerXTimeRemaining: player === 'X' ? Math.max(0, ticTacToeGame.playerXTimeRemaining - timeElapsed) : ticTacToeGame.playerXTimeRemaining,
            playerOTimeRemaining: player === 'O' ? Math.max(0, ticTacToeGame.playerOTimeRemaining - timeElapsed) : ticTacToeGame.playerOTimeRemaining
          },
          include: {
            playerX: true,
            playerO: true
          }
        });

        console.log('[MAKE_MOVE] Updated game state:', {
          gameId,
          player,
          timeElapsed,
          playerXTimeRemaining: updatedGame.playerXTimeRemaining,
          playerOTimeRemaining: updatedGame.playerOTimeRemaining,
          lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
          nextPlayer: updatedGame.nextPlayer
        });

        // Broadcast the updated game state
        io.to(`game:${gameId}`).emit('game_update', {
          id: updatedGame.id,
          squares: updatedGame.squares as Array<PlayerSymbol | null>,
          nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
          gameStatus: updatedGame.gameStatus as GameStatus,
          winner: updatedGame.winner as PlayerSymbol | null,
          playerX: updatedGame.playerX,
          playerO: updatedGame.playerO,
          playerXId: updatedGame.playerXId,
          playerOId: updatedGame.playerOId,
          lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString(),
          playerXTimeRemaining: updatedGame.playerXTimeRemaining,
          playerOTimeRemaining: updatedGame.playerOTimeRemaining
        });
      } catch (error) {
        console.error('Error in make_move:', error);
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    socket.on('disconnect', () => {
      // Remove from queue using the queue service
      queueService.removeFromQueue(socket.id);

      // Check for any active games and handle disconnection
      const handleGameDisconnect = async () => {
        try {
          const games = await prisma.game.findMany({
            where: {
              OR: [
                { playerXId: socket.handshake.auth.userId },
                { playerOId: socket.handshake.auth.userId }
              ],
              gameStatus: 'active'
            }
          });

          for (const game of games) {
            console.log(`[TICTACTOE] Handling disconnect for game ${game.id}`);
            const isPlayerX = game.playerXId === socket.handshake.auth.userId;
            const winner = isPlayerX ? 'O' : 'X';
            
            await prisma.game.update({
              where: { id: game.id },
              data: {
                gameStatus: 'ended',
                winner,
                lastMoveTimestamp: new Date()
              }
            });

            io.to(`game:${game.id}`).emit('game_update', {
              id: game.id,
              gameStatus: 'ended',
              winner,
              message: `${isPlayerX ? 'Player X' : 'Player O'} disconnected`
            });
          }
        } catch (error) {
          console.error('[TICTACTOE] Error handling game disconnect:', error);
        }
      };

      handleGameDisconnect();
    });
  } catch (error) {
    logger.error('[TICTACTOE] Error in setupTicTacToeHandlers:', error);
  }
} 