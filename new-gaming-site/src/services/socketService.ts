import { PlayerSymbol, GameStatus } from '../types';
import ticTacToeSocketService from './ticTacToeSocketService';
import connect4SocketService from './connect4SocketService';

class SocketService {
  private static instance: SocketService;
  private connect4Socket: typeof connect4SocketService;
  private ticTacToeSocket: typeof ticTacToeSocketService;

  private constructor() {
    this.connect4Socket = connect4SocketService;
    this.ticTacToeSocket = ticTacToeSocketService;
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(): void {
    this.connect4Socket.connect();
    this.ticTacToeSocket.connect();
  }

  disconnect(): void {
    this.connect4Socket.disconnect();
    this.ticTacToeSocket.disconnect();
  }

  // Connect 4 methods
  joinConnect4Game(gameId?: number): void {
    if (gameId) {
      this.connect4Socket.joinGame(gameId);
    } else {
      this.connect4Socket.joinQueue();
    }
  }

  makeConnect4Move(gameId: number, column: number): void {
    this.connect4Socket.makeMove(gameId, column);
  }

  onConnect4Queued(callback: (data: { message: string }) => void): void {
    this.connect4Socket.onQueued(callback);
  }

  onConnect4PlayerAssigned(callback: (data: { player: 'red' | 'yellow'; gameState: any }) => void): void {
    this.connect4Socket.onPlayerAssigned(callback);
  }

  onConnect4GameUpdate(callback: (data: any) => void): void {
    this.connect4Socket.onGameUpdate(callback);
  }

  onConnect4Error(callback: (data: { message: string }) => void): void {
    this.connect4Socket.onError(callback);
  }

  onConnect4TimeExpired(callback: (data: { gameId: number; winner: 'red' | 'yellow'; loser: 'red' | 'yellow'; message: string }) => void): void {
    this.connect4Socket.onTimeExpired(callback);
  }

  onConnect4Disconnect(callback: () => void): void {
    this.connect4Socket.onDisconnect(callback);
  }

  onConnect4ConnectError(callback: (error: unknown) => void): void {
    this.connect4Socket.onConnectError(callback);
  }

  // Tic Tac Toe methods
  joinTicTacToeGame(gameId?: number): void {
    if (gameId) {
      this.ticTacToeSocket.joinGame(gameId);
    } else {
      this.ticTacToeSocket.joinQueue();
    }
  }

  makeTicTacToeMove(gameId: number, position: number, player: 'X' | 'O'): void {
    this.ticTacToeSocket.makeMove(gameId, position, player);
  }

  onTicTacToeQueued(callback: (data: { message: string }) => void): void {
    this.ticTacToeSocket.onQueued(callback);
  }

  onTicTacToePlayerAssigned(callback: (data: { player: 'X' | 'O'; gameState: any }) => void): void {
    this.ticTacToeSocket.onPlayerAssigned(callback as any); // Type assertion needed due to type mismatch
  }

  onTicTacToeGameUpdate(callback: (data: any) => void): void {
    this.ticTacToeSocket.onGameUpdate(callback);
  }

  onTicTacToeError(callback: (data: { message: string }) => void): void {
    this.ticTacToeSocket.onError(callback);
  }

  onTicTacToeDisconnect(callback: () => void): void {
    this.ticTacToeSocket.onDisconnect(callback);
  }

  onTicTacToeConnectError(callback: (error: unknown) => void): void {
    this.ticTacToeSocket.onConnectError(callback);
  }

  onDisconnect(callback: () => void): void {
    this.connect4Socket.onDisconnect(callback);
    this.ticTacToeSocket.onDisconnect(callback);
  }

  removeAllListeners(): void {
    this.connect4Socket.removeAllListeners();
    this.ticTacToeSocket.removeAllListeners();
  }
}

export const socketService = SocketService.getInstance(); 