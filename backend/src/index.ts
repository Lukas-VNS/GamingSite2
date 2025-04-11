import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/AuthRoutes';
import gameRoutes from './routes/GameRoutes';
import { QueueManager } from './controllers/QueueManager';
import { TicTacToeServer } from './controllers/TicTacToeServer';
import { Connect4Server } from './controllers/Connect4Server';
import { verifyToken, verifyTokenAndGetUserId } from './middleware/Auth';
import { prisma } from '../prisma/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());

// Health check route before JSON parsing
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// JSON parsing for other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Initialize QueueManager and Game Servers
const queueManager = QueueManager.getInstance(io);
const ticTacToeServer = new TicTacToeServer(io);
const connect4Server = new Connect4Server(io);

// Socket connection handling
io.on('connection', async (socket) => {
  try {
    const userId = await verifyTokenAndGetUserId(socket.handshake.auth.token);
    if (!userId) {
      socket.disconnect();
      return;
    }

    // Set the userId in the socket's data object
    socket.data.userId = userId;
    console.log('Socket connected with userId:', userId);

    // Handle queue events
    socket.on('join-queue', async (data: { gameType: 'tictactoe' | 'connect4', token: string }) => {
      try {
        const decoded = await verifyToken(data.token);
        if (!decoded) {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }

        // Get user info from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true }
        });

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        await queueManager.joinQueue(socket, user.id, user.username, data.gameType);
      } catch (error) {
        socket.emit('error', { message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    socket.on('leave-queue', (data: { gameType: 'tictactoe' | 'connect4' }) => {
      queueManager.leaveQueue(socket.id, data.gameType);
    });

    // Handle game-specific events
    socket.on('joinGame', async (data: { gameId: number; gameType: string }) => {
      try {
        console.log('Received joinGame event:', data);
        // Get the game to determine which server to use
        const game = await prisma.game.findUnique({
          where: { id: data.gameId }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Route to the correct game server
        if (game.gameType === 'tictactoe') {
          await ticTacToeServer.handleJoinGame(userId, data);
        } else if (game.gameType === 'connect4') {
          await connect4Server.handleJoinGame(userId, data);
        } else {
          socket.emit('error', { message: 'Invalid game type' });
        }
      } catch (error) {
        console.error('Error handling joinGame:', error);
        socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to join game' });
      }
    });

    socket.on('makeMove', async (data) => {
      try {
        console.log('Received makeMove event:', data);
        // Get the game to determine which server to use
        const game = await prisma.game.findUnique({
          where: { id: data.gameId }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Route to the correct game server
        if (game.gameType === 'tictactoe') {
          await ticTacToeServer.handleMakeMove(socket, data);
        } else if (game.gameType === 'connect4') {
          await connect4Server.handleMakeMove(socket, data);
        } else {
          socket.emit('error', { message: 'Invalid game type' });
        }
      } catch (error) {
        console.error('Error handling move:', error);
        socket.emit('error', { message: 'Error processing move' });
      }
    });

    socket.on('disconnect', () => {
      // Remove from all queues on disconnect
      queueManager.leaveQueue(socket.id, 'tictactoe');
      queueManager.leaveQueue(socket.id, 'connect4');
      console.log('Client disconnected:', socket.id);
    });

  } catch (error) {
    console.error('Error in socket connection:', error);
    socket.disconnect();
  }
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 