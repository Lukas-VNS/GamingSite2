import { Server, Socket } from 'socket.io';
import { prisma } from '../../prisma/prisma';

interface QueuePlayer {
  socketId: string;
  userId: string;
  username: string;
  gameType: 'tictactoe' | 'connect4';
  joinedAt: Date;
}

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, QueuePlayer[]>;
  private io: Server;

  private constructor(io: Server) {
    this.io = io;
    this.queues = new Map([
      ['tictactoe', []],
      ['connect4', []]
    ]);
  }

  public static getInstance(io: Server): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(io);
    }
    return QueueManager.instance;
  }

  public async joinQueue(socket: Socket, userId: string, username: string, gameType: 'tictactoe' | 'connect4'): Promise<void> {
    const queue = this.queues.get(gameType);
    if (!queue) {
      throw new Error('Invalid game type');
    }

    // Check if player is already in queue
    if (queue.some(player => player.userId === userId)) {
      throw new Error('Player already in queue');
    }

    const player: QueuePlayer = {
      socketId: socket.id,
      userId,
      username,
      gameType,
      joinedAt: new Date()
    };

    queue.push(player);
    this.queues.set(gameType, queue);

    // Check for potential match
    await this.checkForMatch(gameType);

    // Notify player of their position
    const status = this.getQueueStatus(gameType, socket.id);
    socket.emit('queue-update', status);
  }

  public leaveQueue(socketId: string, gameType: 'tictactoe' | 'connect4'): void {
    const queue = this.queues.get(gameType);
    if (!queue) return;

    const index = queue.findIndex(player => player.socketId === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.queues.set(gameType, queue);
    }
  }

  private async checkForMatch(gameType: 'tictactoe' | 'connect4'): Promise<void> {
    const queue = this.queues.get(gameType);
    if (!queue || queue.length < 2) return;

    // Get the first two players
    const [player1, player2] = queue.splice(0, 2);
    this.queues.set(gameType, queue);

    try {
      // Create a new game in the database
      const game = await prisma.game.create({
        data: {
          gameType,
          boardState: gameType === 'tictactoe' ? Array(9).fill(null) : Array(42).fill(null),
          nextPlayer: 1,
          state: 'ACTIVE',
          player1Id: player1.userId,
          player2Id: player2.userId
        }
      });

      // Notify both players
      this.io.to(player1.socketId).emit('game-found', {
        gameId: game.id,
        opponent: player2.username
      });

      this.io.to(player2.socketId).emit('game-found', {
        gameId: game.id,
        opponent: player1.username
      });
    } catch (error) {
      console.error('Error creating game:', error);
      // If game creation fails, put players back in queue
      queue.unshift(player2, player1);
      this.queues.set(gameType, queue);
    }
  }

  public getQueueStatus(gameType: 'tictactoe' | 'connect4', socketId: string): { position: number; totalPlayers: number } {
    const queue = this.queues.get(gameType) || [];
    const playerIndex = queue.findIndex(player => player.socketId === socketId);
    
    return {
      position: playerIndex === -1 ? 0 : playerIndex + 1, // 1-based position
      totalPlayers: queue.length
    };
  }
} 