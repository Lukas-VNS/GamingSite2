import io from 'socket.io-client';
import BaseSocketService from './baseSocketService';
import { PlayerSymbol, GameStatus } from '../types';
import { Socket } from 'socket.io-client';

interface GameUpdateData {
  id: number;
  squares: Array<PlayerSymbol | null>;
  nextPlayer: PlayerSymbol;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
  playerX: {
    id: string;
    username: string;
  };
  playerO: {
    id: string;
    username: string;
  };
  playerXId: string;
  playerOId: string;
  lastMoveTimestamp: string;
  playerXTimeRemaining: number;
  playerOTimeRemaining: number;
}

interface PlayerAssignedData {
  player: 'X' | 'O';
  gameState: GameUpdateData;
}

class TicTacToeSocketService extends BaseSocketService {
  protected connectWithToken(token: string): void {
    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      query: { gameType: 'tic-tac-toe' },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[TICTACTOE] Connected successfully');
    });

    this.socket.on('connect_error', (error: unknown) => {
      console.error('[TICTACTOE] Connection error:', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[TICTACTOE] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.socket?.connect();
      }
    });
  }

  joinQueue(): void {
    this.emit('join_queue', { gameType: 'tic-tac-toe' });
  }

  joinGame(gameId: number): void {
    this.emit('join_game', { gameId });
  }

  makeMove(gameId: number, position: number, player: PlayerSymbol): void {
    this.emit('make_move', { gameId, position, player });
  }

  onGameCreated(callback: (data: { gameId: number; gameType: 'tic-tac-toe' }) => void): void {
    this.on('game_created', callback);
  }

  onQueued(callback: (data: { message: string }) => void): void {
    this.on('queued', callback);
  }

  onPlayerAssigned(callback: (data: { player: PlayerSymbol; gameState: GameUpdateData }) => void): void {
    this.on('player_assigned', callback);
  }

  onGameUpdate(callback: (data: GameUpdateData) => void): void {
    this.on('game_update', callback);
  }

  onError(callback: (data: { message: string }) => void): void {
    this.on('error', callback);
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
    this.off('connect_error');
  }
}

// Create an instance and export it
const ticTacToeSocketServiceInstance = new TicTacToeSocketService();
export default ticTacToeSocketServiceInstance; 