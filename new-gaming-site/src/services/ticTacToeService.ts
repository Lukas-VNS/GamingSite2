import io, { Socket } from 'socket.io-client';
import BaseSocketService from './baseSocketService';
import { PlayerSymbol, GameStatus } from '../types';

interface GameUpdateData {
  board: Array<Array<PlayerSymbol | null>>;
  nextPlayer: PlayerSymbol;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
  lastMoveTimestamp: string;
  playerXTimeRemaining: number;
  playerOTimeRemaining: number;
}

class TicTacToeSocketService extends BaseSocketService {
  private socketUrl: string = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

  protected connectWithToken(token: string): void {
    this.socket = io(this.socketUrl, {
      auth: { token },
      query: { gameType: 'tic-tac-toe' },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[TICTACTOE] Connected to server');
    });

    this.socket.on('connect_error', (error: unknown) => {
      console.error('[TICTACTOE] Connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('[TICTACTOE] Disconnected from server');
    });
  }
}

// Create an instance and export it
const ticTacToeSocketServiceInstance = new TicTacToeSocketService();
export default ticTacToeSocketServiceInstance; 