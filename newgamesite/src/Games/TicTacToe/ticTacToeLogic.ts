export const calculateWinner = (squares: string[]): string | null => {
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
  };
  
  export const isBoardFull = (squares: string[]): boolean => {
    return squares.every(square => square !== '');
  }; 

  export type PlayerSymbol = 'X' | 'O';
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';

export interface GameState {
  id: number;
  squares: Array<PlayerSymbol | null>;
  nextPlayer: PlayerSymbol;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
  player1: {
    id: string;
    username: string;
  };
  player2: {
    id: string;
    username: string;
  };
  player1Id: string;
  player2Id: string;
  player1TimeRemaining: number;
  player2TimeRemaining: number;
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
  const isPlayerX = gameState.player1Id === currentUserId;
  return (isPlayerX && playerSymbol === 'X') || (!isPlayerX && playerSymbol === 'O');
} 