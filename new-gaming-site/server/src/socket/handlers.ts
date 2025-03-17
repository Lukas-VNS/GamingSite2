import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { GameState, PlayerSymbol, checkWinner, isDraw, isValidMove, getNextPlayer } from '../game/gameLogic';

const prisma = new PrismaClient();
const playerQueue: { socketId: string; userId: string }[] = [];

export function setupSocketHandlers(io: Server, socket: Socket) {
  console.log('=== New Socket Connection ===');
  console.log('Socket ID:', socket.id);
  console.log('Auth token present:', !!socket.handshake.auth.token);
  
  socket.on('join_queue', async () => {
    console.log('=== Join Queue Event Received ===');
    console.log('Socket ID:', socket.id);
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log(`User ${socket.id} not authenticated`);
      socket.emit('queue_error', 'Not authenticated');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
        userId: string;
        email: string;
      };

      console.log(`User ${decoded.email} (${socket.id}) joining queue`);
      console.log('Current queue length:', playerQueue.length);
      console.log('Current queue:', playerQueue);

      playerQueue.push({ socketId: socket.id, userId: decoded.userId });
      socket.emit('queue_joined');
      
      if (playerQueue.length >= 2) {
        console.log('Found 2 players, creating game...');
        const player1 = playerQueue.shift()!;
        const player2 = playerQueue.shift()!;
        
        console.log(`Creating game for players:`, {
          player1: { id: player1.userId, socket: player1.socketId },
          player2: { id: player2.userId, socket: player2.socketId }
        });

        const game = await prisma.game.create({
          data: {
            squares: Array(9).fill(null),
            nextPlayer: 'X',
            gameStatus: 'active',
            playerXId: player1.userId,
            playerOId: player2.userId,
            playerXTimeRemaining: 60,
            playerOTimeRemaining: 60,
            lastMoveTimestamp: new Date(),
            playerXReady: true,
            playerOReady: false
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
        });

        const gameState: GameState = {
          id: game.id,
          squares: game.squares as Array<PlayerSymbol | null>,
          nextPlayer: game.nextPlayer as PlayerSymbol,
          gameStatus: game.gameStatus as 'waiting' | 'active' | 'ended' | 'draw',
          winner: game.winner as PlayerSymbol | null,
          playerX: game.playerX,
          playerO: game.playerO,
          playerXId: game.playerX.id,
          playerOId: game.playerO.id,
          playerXTimeRemaining: game.playerXTimeRemaining,
          playerOTimeRemaining: game.playerOTimeRemaining,
          lastMoveTimestamp: game.lastMoveTimestamp.toISOString()
        };

        // Emit game_created event to both players
        io.to(player1.socketId).emit('game_created', game.id.toString());
        io.to(player2.socketId).emit('game_created', game.id.toString());

        // Then emit player assignments
        io.to(player1.socketId).emit('player_assigned', { player: 'X', gameState });
        io.to(player2.socketId).emit('player_assigned', { player: 'O', gameState });
      }
    } catch (error) {
      console.error('Error in join_queue:', error);
      socket.emit('queue_error', 'Failed to join queue');
    }
  });

  socket.on('join_game', async (gameId: number) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.error('No auth token provided for join_game');
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const userId = decoded.userId;

      console.log('[JOIN_GAME] User joining game:', { 
        gameId, 
        userId,
        socketId: socket.id 
      });

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: true,
          playerO: true
        }
      });

      if (!game) {
        console.error('Game not found:', gameId);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      console.log('[JOIN_GAME] Current game state:', {
        gameId,
        gameStatus: game.gameStatus,
        nextPlayer: game.nextPlayer,
        playerXReady: game.playerXReady,
        playerOReady: game.playerOReady,
        playerXId: game.playerXId,
        playerOId: game.playerOId,
        currentUserId: userId
      });

      // Join the game room
      socket.join(`game:${gameId}`);
      console.log('[JOIN_GAME] Socket joined room:', `game:${gameId}`);

      // If this is the first player joining, start the timer
      if (!game.playerXReady && !game.playerOReady) {
        console.log('[JOIN_GAME] First player joining, updating lastMoveTimestamp');
        await prisma.game.update({
          where: { id: gameId },
          data: {
            lastMoveTimestamp: new Date()
          }
        });
      }

      // Update ready status
      const isPlayerX = game.playerXId === userId;
      const readyField = isPlayerX ? 'playerXReady' : 'playerOReady';
      const playerSymbol = isPlayerX ? 'X' : 'O';
      
      console.log('[JOIN_GAME] Updating ready status:', {
        isPlayerX,
        readyField,
        playerSymbol,
        userId
      });

      await prisma.game.update({
        where: { id: gameId },
        data: {
          [readyField]: true
        }
      });

      // Check if both players are ready
      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: true,
          playerO: true
        }
      });

      console.log('[JOIN_GAME] After ready status update:', {
        gameId,
        playerXReady: updatedGame?.playerXReady,
        playerOReady: updatedGame?.playerOReady,
        gameStatus: updatedGame?.gameStatus
      });

      if (updatedGame && updatedGame.playerXReady && updatedGame.playerOReady) {
        console.log('[JOIN_GAME] Both players ready, initializing game');
        
        // Only update the game state if it's still in waiting status
        if (updatedGame.gameStatus === 'waiting') {
          const initializedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
              gameStatus: 'active',
              nextPlayer: 'X',
              squares: Array(9).fill(null),
              winner: null,
              playerXTimeRemaining: 60,
              playerOTimeRemaining: 60,
              lastMoveTimestamp: new Date()
            }
          });

          console.log('[JOIN_GAME] Game initialized:', {
            gameId,
            gameStatus: initializedGame.gameStatus,
            nextPlayer: initializedGame.nextPlayer,
            squares: initializedGame.squares
          });
        }

        const finalGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (finalGame) {
          const gameState: GameState = {
            id: finalGame.id,
            squares: finalGame.squares as Array<PlayerSymbol | null>,
            nextPlayer: finalGame.nextPlayer as PlayerSymbol,
            gameStatus: finalGame.gameStatus as 'waiting' | 'active' | 'ended' | 'draw',
            winner: finalGame.winner as PlayerSymbol | null,
            playerX: finalGame.playerX,
            playerO: finalGame.playerO,
            playerXId: finalGame.playerX.id,
            playerOId: finalGame.playerO.id,
            playerXTimeRemaining: finalGame.playerXTimeRemaining,
            playerOTimeRemaining: finalGame.playerOTimeRemaining,
            lastMoveTimestamp: finalGame.lastMoveTimestamp.toISOString()
          };

          console.log('[JOIN_GAME] Prepared game state for emission:', {
            gameId,
            gameStatus: gameState.gameStatus,
            nextPlayer: gameState.nextPlayer,
            playerX: gameState.playerX.username,
            playerO: gameState.playerO.username
          });

          // Re-emit player assignments
          const roomSockets = await io.in(`game:${gameId}`).fetchSockets();
          console.log('[JOIN_GAME] Room sockets:', {
            gameId,
            socketCount: roomSockets.length,
            socketIds: roomSockets.map(s => s.id)
          });

          // Emit player assignments based on user ID
          for (const sock of roomSockets) {
            const sockUserId = jwt.verify(sock.handshake.auth.token, process.env.JWT_SECRET!) as { userId: string };
            const isX = sockUserId.userId === finalGame.playerXId;
            console.log('[JOIN_GAME] Emitting player assignment:', {
              socketId: sock.id,
              userId: sockUserId.userId,
              assignedSymbol: isX ? 'X' : 'O'
            });
            sock.emit('player_assigned', { 
              player: isX ? 'X' : 'O' as PlayerSymbol, 
              gameState 
            });
          }

          // Also emit game update to everyone
          console.log('[JOIN_GAME] Emitting game update to room:', `game:${gameId}`);
          io.to(`game:${gameId}`).emit('game_update', gameState);
        }
      }
    } catch (error) {
      console.error('[JOIN_GAME] Error:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  socket.on('make_move', async (data: { gameId: number; position: number; player: 'X' | 'O' }) => {
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

      console.log('Received move:', { gameId, position, player, userId });

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: true,
          playerO: true
        }
      });

      if (!game) {
        console.error('Game not found:', gameId);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if game is already ended
      if (game.gameStatus === 'ended' || game.gameStatus === 'draw') {
        console.error('Game is already over:', game.gameStatus);
        socket.emit('error', { message: 'Game is already over' });
        return;
      }

      // Validate that the move is made by the correct player
      if ((player === 'X' && game.playerXId !== userId) || 
          (player === 'O' && game.playerOId !== userId)) {
        console.error('Invalid player making move:', { player, userId });
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      // Validate that it's the player's turn
      if (game.nextPlayer !== player) {
        console.error('Not player\'s turn:', { nextPlayer: game.nextPlayer, player });
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      // Check if player has time remaining
      const timeField = player === 'X' ? 'playerXTimeRemaining' : 'playerOTimeRemaining';
      const currentTime = await updatePlayerTimeRemaining(gameId, player);
      
      if (currentTime <= 0) {
        console.error('Player ran out of time:', { player, timeRemaining: currentTime });
        // End the game with the other player as winner
        const winner = player === 'X' ? 'O' : 'X';
        await prisma.game.update({
          where: { id: gameId },
          data: {
            gameStatus: 'ended',
            winner,
            playerXTimeRemaining: 0,
            playerOTimeRemaining: 0,
            lastMoveTimestamp: new Date()
          }
        });

        const updatedGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (updatedGame) {
          const gameState: GameState = {
            id: updatedGame.id,
            squares: updatedGame.squares as Array<PlayerSymbol | null>,
            nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
            gameStatus: updatedGame.gameStatus as 'waiting' | 'active' | 'ended' | 'draw',
            winner: updatedGame.winner as PlayerSymbol | null,
            playerX: updatedGame.playerX,
            playerO: updatedGame.playerO,
            playerXId: updatedGame.playerX.id,
            playerOId: updatedGame.playerO.id,
            playerXTimeRemaining: updatedGame.playerXTimeRemaining,
            playerOTimeRemaining: updatedGame.playerOTimeRemaining,
            lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString()
          };
          io.to(`game:${gameId}`).emit('game_update', gameState);
        }
        socket.emit('error', { message: 'Time expired' });
        return;
      }

      // Update the game state
      const squares = game.squares as string[];
      if (squares[position] || position < 0 || position >= 9) {
        console.error('Invalid move:', { position, square: squares[position] });
        socket.emit('error', { message: 'Invalid move' });
        return;
      }

      squares[position] = player;
      const nextPlayer = player === 'X' ? 'O' : 'X';

      // Check for winner or draw
      const winner = calculateWinner(squares);
      const isGameDraw = !winner && squares.every(square => square !== null);

      // Update game state
      await prisma.game.update({
        where: { id: gameId },
        data: {
          squares,
          nextPlayer,
          gameStatus: winner ? 'ended' : isGameDraw ? 'draw' : 'active',
          winner: winner || null,
          lastMoveTimestamp: new Date()
        }
      });

      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: true,
          playerO: true
        }
      });

      if (updatedGame) {
        const gameState: GameState = {
          id: updatedGame.id,
          squares: updatedGame.squares as Array<PlayerSymbol | null>,
          nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
          gameStatus: updatedGame.gameStatus as 'waiting' | 'active' | 'ended' | 'draw',
          winner: updatedGame.winner as PlayerSymbol | null,
          playerX: updatedGame.playerX,
          playerO: updatedGame.playerO,
          playerXId: updatedGame.playerX.id,
          playerOId: updatedGame.playerO.id,
          playerXTimeRemaining: updatedGame.playerXTimeRemaining,
          playerOTimeRemaining: updatedGame.playerOTimeRemaining,
          lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString()
        };
        io.to(`game:${gameId}`).emit('game_update', gameState);
      }
    } catch (error) {
      console.error('Error in make_move:', error);
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  socket.on('disconnect', () => {
    const queueIndex = playerQueue.findIndex(p => p.socketId === socket.id);
    if (queueIndex !== -1) {
      playerQueue.splice(queueIndex, 1);
    }
  });

  socket.on('time_expired', async (data: { gameId: number; player: 'X' | 'O' }) => {
    try {
      const { gameId, player } = data;
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('No auth token provided for time_expired');
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const userId = decoded.userId;

      console.log('Time expired:', { gameId, player, userId });

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          playerX: true,
          playerO: true
        }
      });

      if (!game) {
        console.error('Game not found:', gameId);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Validate that the player reporting time expiration is the correct player
      if ((player === 'X' && game.playerXId !== userId) || 
          (player === 'O' && game.playerOId !== userId)) {
        console.error('Invalid player reporting time expiration:', { player, userId });
        socket.emit('error', { message: 'Not authorized' });
        return;
      }

      // Only end the game if it's still active
      if (game.gameStatus === 'active') {
        // End the game with the other player as winner
        const winner = player === 'X' ? 'O' : 'X';
        await prisma.game.update({
          where: { id: gameId },
          data: {
            gameStatus: 'ended',
            winner,
            playerXTimeRemaining: 0,
            playerOTimeRemaining: 0,
            lastMoveTimestamp: new Date()
          }
        });

        const updatedGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            playerX: true,
            playerO: true
          }
        });

        if (updatedGame) {
          const gameState: GameState = {
            id: updatedGame.id,
            squares: updatedGame.squares as Array<PlayerSymbol | null>,
            nextPlayer: updatedGame.nextPlayer as PlayerSymbol,
            gameStatus: updatedGame.gameStatus as 'waiting' | 'active' | 'ended' | 'draw',
            winner: updatedGame.winner as PlayerSymbol | null,
            playerX: updatedGame.playerX,
            playerO: updatedGame.playerO,
            playerXId: updatedGame.playerX.id,
            playerOId: updatedGame.playerO.id,
            playerXTimeRemaining: updatedGame.playerXTimeRemaining,
            playerOTimeRemaining: updatedGame.playerOTimeRemaining,
            lastMoveTimestamp: updatedGame.lastMoveTimestamp.toISOString()
          };
          io.to(`game:${gameId}`).emit('game_update', gameState);
        }
      }
    } catch (error) {
      console.error('Error in time_expired:', error);
      socket.emit('error', { message: 'Failed to handle time expiration' });
    }
  });
}

async function updatePlayerTimeRemaining(gameId: number, player: 'X' | 'O'): Promise<number> {
  const game = await prisma.game.findUnique({
    where: { id: gameId }
  });

  if (!game) return 0;

  const now = new Date();
  const lastMove = game.lastMoveTimestamp;
  const timeElapsed = Math.floor((now.getTime() - lastMove.getTime()) / 1000);
  
  const timeField = player === 'X' ? 'playerXTimeRemaining' : 'playerOTimeRemaining';
  const currentTime = game[timeField];
  const newTime = Math.max(0, currentTime - timeElapsed);

  await prisma.game.update({
    where: { id: gameId },
    data: {
      [timeField]: newTime,
      lastMoveTimestamp: now
    }
  });

  return newTime;
}

function calculateWinner(squares: string[]): PlayerSymbol | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a] as PlayerSymbol;
    }
  }
  return null;
}