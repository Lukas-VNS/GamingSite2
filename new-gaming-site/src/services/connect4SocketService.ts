import { Socket } from 'socket.io-client';
import BaseSocketService from './baseSocketService';
import io from 'socket.io-client';
import { PlayerSymbol, GameStatus } from '../types';

interface GameUpdateData {
  id: number;
  board: Array<Array<'red' | 'yellow' | null>>;
  nextPlayer: 'red' | 'yellow';
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'red' | 'yellow' | null;
  playerRed: {
    id: string;
    username: string;
  };
  playerYellow: {
    id: string;
    username: string;
  };
  playerRedId: string;
  playerYellowId: string;
  lastMoveTimestamp: string;
  playerRedTimeRemaining: number;
  playerYellowTimeRemaining: number;
}

interface PlayerAssignedData {
  player: 'red' | 'yellow';
  gameState: GameUpdateData;
}

class Connect4SocketService extends BaseSocketService {
  protected connectWithToken(token: string): void {
    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      query: { gameType: 'connect4' },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[CONNECT4] Connected successfully');
    });

    this.socket.on('connect_error', (error: unknown) => {
      console.error('[CONNECT4] Connection error:', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[CONNECT4] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.socket?.connect();
      }
    });
  }

  joinQueue(): void {
    this.emit('join_queue', { gameType: 'connect4' });
  }

  joinGame(gameId: number): void {
    this.emit('join_game', { gameId });
  }

  makeMove(gameId: number, column: number): void {
    this.emit('make_move', { gameId, column });
  }

  onGameCreated(callback: (data: { gameId: number; gameType: 'connect4'; player: 'red' | 'yellow' }) => void): void {
    this.on('game_created', callback);
  }

  onQueued(callback: (data: { message: string }) => void): void {
    this.on('queued', callback);
  }

  onPlayerAssigned(callback: (data: { player: 'red' | 'yellow'; gameState: GameUpdateData }) => void): void {
    this.on('player_assigned', callback);
  }

  onGameUpdate(callback: (data: GameUpdateData) => void): void {
    this.on('game_update', callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.on('error', callback);
  }

  onTimeExpired(callback: (data: { gameId: number; winner: 'red' | 'yellow'; loser: 'red' | 'yellow'; message: string }) => void): void {
    this.on('time_expired', callback);
  }

  onDisconnect(callback: () => void): void {
    this.on('disconnect', callback);
  }

  onConnectError(callback: (error: unknown) => void): void {
    this.on('connect_error', callback);
  }

  removeAllListeners(): void {
    this.off('game_created');
    this.off('queued');
    this.off('player_assigned');
    this.off('game_update');
    this.off('error');
    this.off('time_expired');
    this.off('connect_error');
  }
}

// Create an instance and export it
const connect4SocketServiceInstance = new Connect4SocketService();
export default connect4SocketServiceInstance; 