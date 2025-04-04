import { PlayerSymbol } from '../types';

export function getLowestEmptyPosition(board: Array<Array<PlayerSymbol | null>>, column: number): number {
  for (let row = board.length - 1; row >= 0; row--) {
    if (board[row][column] === null) {
      return row;
    }
  }
  return -1;
}

export function checkConnect4Winner(board: Array<Array<PlayerSymbol | null>>): PlayerSymbol | null {
  // Check horizontal
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col <= board[0].length - 4; col++) {
      const player = board[row][col];
      if (player && 
          board[row][col + 1] === player &&
          board[row][col + 2] === player &&
          board[row][col + 3] === player) {
        return player;
      }
    }
  }

  // Check vertical
  for (let row = 0; row <= board.length - 4; row++) {
    for (let col = 0; col < board[0].length; col++) {
      const player = board[row][col];
      if (player &&
          board[row + 1][col] === player &&
          board[row + 2][col] === player &&
          board[row + 3][col] === player) {
        return player;
      }
    }
  }

  // Check diagonal (positive slope)
  for (let row = 3; row < board.length; row++) {
    for (let col = 0; col <= board[0].length - 4; col++) {
      const player = board[row][col];
      if (player &&
          board[row - 1][col + 1] === player &&
          board[row - 2][col + 2] === player &&
          board[row - 3][col + 3] === player) {
        return player;
      }
    }
  }

  // Check diagonal (negative slope)
  for (let row = 0; row <= board.length - 4; row++) {
    for (let col = 0; col <= board[0].length - 4; col++) {
      const player = board[row][col];
      if (player &&
          board[row + 1][col + 1] === player &&
          board[row + 2][col + 2] === player &&
          board[row + 3][col + 3] === player) {
        return player;
      }
    }
  }

  return null;
}

export function isConnect4Draw(board: Array<Array<PlayerSymbol | null>>): boolean {
  return board.every(row => row.every(cell => cell !== null));
} 