import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface QueueEntry {
  socketId: string;
  userId: string;
  gameType: 'tic-tac-toe' | 'connect4';
}

class QueueService {
  private static instance: QueueService;
  private queues: Map<string, QueueEntry[]> = new Map();

  private constructor() {
    this.queues.set('tic-tac-toe', []);
    this.queues.set('connect4', []);
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public addToQueue(entry: QueueEntry): void {
    const queue = this.queues.get(entry.gameType);
    if (!queue) {
      logger.error(`[QUEUE] Invalid game type: ${entry.gameType}`);
      return;
    }

    // Check if user is already in queue
    const existingEntry = queue.find(q => q.userId === entry.userId);
    if (existingEntry) {
      logger.warn(`[QUEUE] User ${entry.userId} already in queue, updating socket ID`);
      existingEntry.socketId = entry.socketId;
      return;
    }

    logger.info(`[QUEUE] Adding user ${entry.userId} to ${entry.gameType} queue`);
    queue.push(entry);
  }

  public removeFromQueue(socketId: string): void {
    for (const [gameType, queue] of this.queues.entries()) {
      const index = queue.findIndex(q => q.socketId === socketId);
      if (index !== -1) {
        logger.info(`[QUEUE] Removing user ${queue[index].userId} from ${gameType} queue`);
        queue.splice(index, 1);
        break;
      }
    }
  }

  public getWaitingPlayers(gameType: 'tic-tac-toe' | 'connect4'): QueueEntry[] {
    const queue = this.queues.get(gameType);
    return queue || [];
  }

  public removePlayersFromQueue(playerIds: string[]): void {
    for (const [gameType, queue] of this.queues.entries()) {
      this.queues.set(
        gameType,
        queue.filter(q => !playerIds.includes(q.userId))
      );
    }
  }
}

export const queueService = QueueService.getInstance(); 