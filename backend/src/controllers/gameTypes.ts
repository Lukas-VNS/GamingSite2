export type GameType = 'tictactoe' | 'connect4';

export interface Player {
  id: string;
  username: string;
  socketId: string;
}

export interface BaseGameState {
  id: number;
  gameType: GameType;
  status: 'waiting' | 'active' | 'ended' | 'draw';
  currentPlayer: string;
  players: {
    player1: Player | null;
    player2: Player | null;
  };
  lastMoveTimestamp: string;
}

export interface SocketMessage {
  type: string;
  payload: any;
}

// Client to Server Events
export interface ClientEvents {
  joinGame: (gameId: number) => void;
  makeMove: (data: { gameId: number; position: number }) => void;
  leaveGame: (gameId: number) => void;
}

// Server to Client Events
export interface ServerEvents {
  gameCreated: (game: BaseGameState) => void;
  gameUpdated: (game: BaseGameState) => void;
  gameEnded: (game: BaseGameState) => void;
  error: (message: string) => void;
} 