import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/AuthRoutes';
import gameRoutes from './routes/GameRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Health check route before JSON parsing
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// JSON parsing for other routes
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// Socket.io initialization
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 