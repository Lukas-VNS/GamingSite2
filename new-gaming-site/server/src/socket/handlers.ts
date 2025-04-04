import { Server, Socket } from 'socket.io';
import { setupConnect4Handlers } from './connect4Handlers';
import { setupTicTacToeHandlers } from './ticTacToeHandlers';

export function setupSocketHandlers(io: Server, socket: Socket) {
  console.log('Client connected:', socket.id);

  // Get the game type from the socket query
  const gameType = socket.handshake.query.gameType as string | undefined;

  // Set up the appropriate handler based on game type
  if (gameType === 'connect4') {
    console.log(`[SOCKET] Setting up Connect4 handlers for socket ${socket.id}`);
    setupConnect4Handlers(io, socket);
  } else if (gameType === 'tic-tac-toe') {
    console.log(`[SOCKET] Setting up TicTacToe handlers for socket ${socket.id}`);
    setupTicTacToeHandlers(io, socket);
  } else {
    console.log(`[SOCKET] No game type specified for socket ${socket.id}, setting up both handlers`);
    setupConnect4Handlers(io, socket);
    setupTicTacToeHandlers(io, socket);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
}