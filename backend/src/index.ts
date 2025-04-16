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

// Initialize game servers - socket handlers will be set up by the first one
const ticTacToeServer = new TicTacToeServer(io);
const connect4Server = new Connect4Server(io);

// Add a method to route the game type to the correct server
const routeGameType = (gameType: string) => {
  switch (gameType) {
    case 'tictactoe':
      return ticTacToeServer;
    case 'connect4':
      return connect4Server;
    default:
      throw new Error(`Invalid game type: ${gameType}`);
  }
};

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 