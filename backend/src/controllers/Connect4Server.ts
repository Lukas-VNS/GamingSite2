import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { BaseGameServer } from './BaseGameServer';
import { prisma } from '../../prisma/prisma';

type Connect4Board = ('R' | 'Y' | '')[][];

export class Connect4Server extends BaseGameServer {
  constructor(io: Server) {
    super(io);
  }

  protected async validateAndUpdateMove(game: any, position: number, userId: string) {
    const board = game.boardState as Connect4Board;
    
    if (position < 0 || position > 6) {
      return { isValidMove: false, updatedBoardState: board };
    }

    // Find the lowest empty row in the column
    let row = 5;
    while (row >= 0 && board[row][position] !== '') {
      row--;
    }

    if (row < 0) {
      return { isValidMove: false, updatedBoardState: board };
    }

    const updatedBoard = board.map(row => [...row]);
    updatedBoard[row][position] = game.nextPlayer === 1 ? 'R' : 'Y';

    return { isValidMove: true, updatedBoardState: updatedBoard };
  }

  protected async checkGameState(game: any) {
    const board = game.boardState as Connect4Board;
    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(row => row.every(cell => cell !== ''));

    return {
      isActive: !winner && !isDraw,
      isEnded: !!winner || isDraw,
      winner: winner ? (winner === 'R' ? game.player1Id : game.player2Id) : null,
      isDraw,
      boardState: board,
      currentPlayer: game.nextPlayer === 1 ? game.player1Id : game.player2Id
    };
  }

  private checkWinner(board: Connect4Board): 'R' | 'Y' | null {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row][col + 1] && cell === board[row][col + 2] && cell === board[row][col + 3]) {
          return cell as 'R' | 'Y';
        }
      }
    }

    // Check vertical
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col] && cell === board[row + 2][col] && cell === board[row + 3][col]) {
          return cell as 'R' | 'Y';
        }
      }
    }

    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col + 1] && cell === board[row + 2][col + 2] && cell === board[row + 3][col + 3]) {
          return cell as 'R' | 'Y';
        }
      }
    }

    // Check diagonal (down-left)
    for (let row = 0; row < 3; row++) {
      for (let col = 3; col < 7; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col - 1] && cell === board[row + 2][col - 2] && cell === board[row + 3][col - 3]) {
          return cell as 'R' | 'Y';
        }
      }
    }

    return null;
  }

  protected async updateGameState(game: Game, position: number, userId: string): Promise<Game> {
    const board = JSON.parse(game.boardState as string);
    const playerNumber = game.player1Id === userId ? '1' : '2';
    
    // Add the piece to the column
    board[position].push(playerNumber);

    // Update the game state
    return prisma.game.update({
      where: { id: game.id },
      data: {
        boardState: JSON.stringify(board),
        nextPlayer: game.nextPlayer === 1 ? 2 : 1
      }
    });
  }

  // Legacy methods to satisfy the abstract class requirements
  protected validateMove(game: Game, position: number, userId: string): boolean {
    return true; // This is now handled in validateAndUpdateMove
  }

  protected checkGameEnd(game: Game): { isEnded: boolean; winner: string | null } {
    return { isEnded: false, winner: null }; // This is now handled in checkGameState
  }
} 