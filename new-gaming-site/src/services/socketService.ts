import io from 'socket.io-client';
import { Socket } from 'socket.io-client';

interface GameUpdateData {
  squares: Array<'X' | 'O' | null>;
  nextPlayer: 'X' | 'O';
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  timers: {
    X: number;
    O: number;
  };
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  winReason?: 'timeout' | 'disconnect';
}

interface ReadyUpdateData {
  readyStatus: {
    X: boolean;
    O: boolean;
  };
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
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
}

interface PlayersUpdateData {
  count: number;
}

class SocketService {
  private socket: typeof Socket | null = null;
  private readonly serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  connect(): void {
    console.log('Attempting to connect to:', this.serverUrl);
    this.socket = io(this.serverUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket?.id);
    });
    
    this.socket.on('connect_error', (error: Error) => {
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

  // Make sure this function exists and works correctly
  setPlayerReady(gameId: string, player: 'X' | 'O'): void {
    if (this.socket) {
      console.log(`Emitting player_ready for ${player} in game ${gameId}`);
      this.socket.emit('player_ready', { gameId, player });
    } else {
      console.error('Socket not connected');
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

  onReadyUpdate(callback: (data: ReadyUpdateData) => void): void {
    if (this.socket) {
      this.socket.on('ready_update', callback);
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
      this.socket.off('ready_update');
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