export type PlayerSymbol = 'player1' | 'player2';
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';

export type GameState = {
  id: number;
  board: string[][];
  boardState?: number[][];
  nextPlayer: 'player1' | 'player2';
  gameStatus: 'waiting' | 'active' | 'ended' | 'draw';
  winner: string | null;
  player1?: {
    id: string;
    username: string;
  };
  player2?: {
    id: string;
    username: string;
  };
  player1Id: string;
  player2Id: string;
  player1TimeRemaining: number;
  player2TimeRemaining: number;
  lastMoveTimestamp: string;
};

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;

export function checkWinner(squares: Array<PlayerSymbol | null>): PlayerSymbol | null {
  // Check horizontal
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
      const index = row * BOARD_WIDTH + col;
      if (squares[index] && 
          squares[index] === squares[index + 1] && 
          squares[index] === squares[index + 2] && 
          squares[index] === squares[index + 3]) {
        return squares[index];
      }
    }
  }

  // Check vertical
  for (let col = 0; col < BOARD_WIDTH; col++) {
    for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
      const index = row * BOARD_WIDTH + col;
      if (squares[index] && 
          squares[index] === squares[index + BOARD_WIDTH] && 
          squares[index] === squares[index + 2 * BOARD_WIDTH] && 
          squares[index] === squares[index + 3 * BOARD_WIDTH]) {
        return squares[index];
      }
    }
  }

  // Check diagonal (positive slope)
  for (let row = 0; row <= BOARD_HEIGHT - 4; row++) {
    for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
      const index = row * BOARD_WIDTH + col;
      if (squares[index] && 
          squares[index] === squares[index + BOARD_WIDTH + 1] && 
          squares[index] === squares[index + 2 * BOARD_WIDTH + 2] && 
          squares[index] === squares[index + 3 * BOARD_WIDTH + 3]) {
        return squares[index];
      }
    }
  }

  // Check diagonal (negative slope)
  for (let row = 3; row < BOARD_HEIGHT; row++) {
    for (let col = 0; col <= BOARD_WIDTH - 4; col++) {
      const index = row * BOARD_WIDTH + col;
      if (squares[index] && 
          squares[index] === squares[index - BOARD_WIDTH + 1] && 
          squares[index] === squares[index - 2 * BOARD_WIDTH + 2] && 
          squares[index] === squares[index - 3 * BOARD_WIDTH + 3]) {
        return squares[index];
      }
    }
  }

  return null;
}

export function isValidMove(squares: Array<PlayerSymbol | null>, position: number): boolean {
  // Check if the column is full
  const col = position % BOARD_WIDTH;
  const topRowIndex = col;
  return squares[topRowIndex] === null;
}

export function getNextPlayer(currentPlayer: PlayerSymbol): PlayerSymbol {
  return currentPlayer === 'player1' ? 'player2' : 'player1';
}

export function isPlayerTurn(
  currentUserId: string,
  gameState: GameState,
  playerSymbol: PlayerSymbol
): boolean {
  const isPlayer1 = gameState.player1Id === currentUserId;
  return (isPlayer1 && playerSymbol === 'player1') || (!isPlayer1 && playerSymbol === 'player2');
}

export function getLowestEmptyPosition(board: Array<Array<PlayerSymbol | null>>, col: number): [number, number] | null {
  for (let row = board.length - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return [row, col];
    }
  }
  return null; // Column is full
} 