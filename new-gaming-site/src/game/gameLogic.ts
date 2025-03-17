export type PlayerSymbol = 'X' | 'O';
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';

export interface GameState {
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
  playerXTimeRemaining: number;
  playerOTimeRemaining: number;
  lastMoveTimestamp: string;
}

export function checkWinner(squares: Array<PlayerSymbol | null>): PlayerSymbol | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

export function isDraw(squares: Array<PlayerSymbol | null>): boolean {
  return squares.every(square => square !== null);
}

export function isValidMove(squares: Array<PlayerSymbol | null>, position: number): boolean {
  return position >= 0 && position < 9 && squares[position] === null;
}

export function getNextPlayer(currentPlayer: PlayerSymbol): PlayerSymbol {
  return currentPlayer === 'X' ? 'O' : 'X';
}

export function isPlayerTurn(
  currentUserId: string,
  gameState: GameState,
  playerSymbol: PlayerSymbol
): boolean {
  const isPlayerX = gameState.playerXId === currentUserId;
  return (isPlayerX && playerSymbol === 'X') || (!isPlayerX && playerSymbol === 'O');
} 