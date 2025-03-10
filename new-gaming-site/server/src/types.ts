export interface GameState {
  squares: Array<'X' | 'O' | null>;
  nextPlayer: 'X' | 'O';
  players: {
    X: string | null; // socket.id of X player
    O: string | null; // socket.id of O player
  };
  readyStatus: {
    X: boolean;
    O: boolean;
  };
  timers: {
    X: number; // Time in seconds
    O: number;
  };
  timerInterval: NodeJS.Timeout | null;
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: 'X' | 'O' | null;
  disconnectTimers: {
    X: NodeJS.Timeout | null;
    O: NodeJS.Timeout | null;
  };
}

export type PlayerSymbol = 'X' | 'O';
export type WinReason = 'timeout' | 'disconnect' | 'normal' | null; 