export type PlayerSymbol = 'X' | 'O' | 'red' | 'yellow';
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';
export type WinReason = 'timeout' | 'disconnect' | 'normal' | null;

export interface GameState {
  id: number;
  squares?: Array<PlayerSymbol | null>;
  board?: Array<Array<PlayerSymbol | null>>;
  nextPlayer: PlayerSymbol;
  players?: {
    X: string | null; // socket.id of X player
    O: string | null; // socket.id of O player
    red?: boolean;
    yellow?: boolean;
  };
  readyStatus?: {
    X: boolean;
    O: boolean;
    red?: boolean;
    yellow?: boolean;
  };
  timers?: {
    X: number; // Time in seconds
    O: number;
  };
  timerInterval?: NodeJS.Timeout | null;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
  disconnectTimers?: {
    X: NodeJS.Timeout | null;
    O: NodeJS.Timeout | null;
  };
  playerX?: {
    id: string;
    username: string;
  };
  playerO?: {
    id: string;
    username: string;
  };
  playerXId?: string;
  playerOId?: string;
  playerXTimeRemaining?: number;
  playerOTimeRemaining?: number;
  playerRed?: {
    id: string;
    username: string;
  };
  playerYellow?: {
    id: string;
    username: string;
  };
  playerRedId?: string;
  playerYellowId?: string;
  playerRedTimeRemaining?: number;
  playerYellowTimeRemaining?: number;
  lastMoveTimestamp: string;
} 