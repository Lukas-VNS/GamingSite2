import { io, Socket } from 'socket.io-client';

interface GameUpdateData {
  squares: Array<'X' | 'O' | null>;
  nextPlayer: 'X' | 'O';
  timers: {
    X: number;
    O: number;
  };
  gameStatus: 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  winReason?: 'timeout' | 'disconnect';
}

interface TimerUpdateData {
  timers: {
    X: number;
    O: number;
  };
}

interface PlayerAssignedData {
  player: 'X' | 'O';
  playersConnected: number;
  gameStatus: 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
}

interface PlayersUpdateData {
  count: number;
}

class SocketService {
  private socket: Socket | null = null;
  private readonly serverUrl = 'http://localhost:8080';

  connect(): void {
    console.log('Attempting to connect to:', this.serverUrl);
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket?.id);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error details:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGame(gameId: string): void {
    if (this.socket) {
      this.socket.emit('join_game', gameId);
    }
  }

  makeMove(gameId: string, position: number, player: 'X' | 'O'): void {
    if (this.socket) {
      this.socket.emit('make_move', { gameId, position, player });
    }
  }

  resetGame(gameId: string): void {
    if (this.socket) {
      this.socket.emit('reset_game', gameId);
    }
  }

  onPlayerAssigned(callback: (data: PlayerAssignedData) => void): void {
    if (this.socket) {
      this.socket.on('player_assigned', callback);
    }
  }

  onPlayersUpdate(callback: (data: PlayersUpdateData) => void): void {
    if (this.socket) {
      this.socket.on('players_update', callback);
    }
  }

  onGameUpdate(callback: (data: GameUpdateData) => void): void {
    if (this.socket) {
      this.socket.on('game_update', callback);
    }
  }

  onTimerUpdate(callback: (data: TimerUpdateData) => void): void {
    if (this.socket) {
      this.socket.on('timer_update', callback);
    }
  }

  removeAllListeners(): void {
    if (this.socket) {
      this.socket.off('player_assigned');
      this.socket.off('players_update');
      this.socket.off('game_update');
      this.socket.off('timer_update');
    }
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create an instance and export it
const socketServiceInstance = new SocketService();
export default socketServiceInstance; 