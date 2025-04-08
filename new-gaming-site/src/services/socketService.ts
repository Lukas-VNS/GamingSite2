import { PlayerSymbol, GameStatus } from '../types';
import baseSocketService from './baseSocketService';
import io from 'socket.io-client';

interface GameCreatedData {
  gameId: number;
  gameType: 'connect4' | 'tic-tac-toe';
  player: PlayerSymbol;
}

interface GameUpdateData {
  gameType: 'connect4' | 'tic-tac-toe';
  boardState: any;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
}

class SocketService extends baseSocketService {
  private static instance: SocketService;

  private constructor() {
    super();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  protected connectWithToken(token: string): void {
    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  // Common event listeners
  onQueued(callback: (data: { message: string }) => void): void {
    this.on('queue_joined', callback);
  }

  onGameCreated(callback: (data: GameCreatedData) => void): void {
    this.on('game_created', callback);
  }

  onGameUpdate(callback: (data: GameUpdateData) => void): void {
    this.on('game_update', callback);
  }

  onDisconnect(callback: () => void): void {
    this.on('disconnect', callback);
  }

  // Unified game methods
  joinGame(gameType: 'connect4' | 'tic-tac-toe', gameId?: number): void {
    if (gameId) {
      this.emit('join_game', { gameId });
    } else {
      this.emit('join_queue', { gameType });
    }
  }

  makeMove(gameId: number, position: number, playerNumber: number): void {
    this.emit('make_move', { gameId, position, playerNumber });
  }
}

export default SocketService.getInstance(); 