import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/AuthRoutes';
import gameRoutes from './routes/GameRoutes';
import { QueueManager } from './controllers/QueueManager';
import { verifyToken } from './middleware/Auth';
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

// Initialize QueueManager
const queueManager = QueueManager.getInstance(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

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

  socket.on('disconnect', () => {
    // Remove from all queues on disconnect
    queueManager.leaveQueue(socket.id, 'tictactoe');
    queueManager.leaveQueue(socket.id, 'connect4');
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 