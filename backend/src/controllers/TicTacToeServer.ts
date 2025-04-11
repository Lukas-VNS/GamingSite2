import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { BaseGameServer } from './BaseGameServer';
import { prisma } from '../../prisma/prisma';

type TicTacToeBoard = ('X' | 'O' | '')[];

export class TicTacToeServer extends BaseGameServer {
  constructor(io: Server) {
    super(io);
  }

  protected async validateAndUpdateMove(game: any, position: number, userId: string) {
    const board = game.boardState as TicTacToeBoard;
    
    if (position < 0 || position > 8) {
      return { isValidMove: false, updatedBoardState: board };
    }
    
    if (board[position] !== '') {
      return { isValidMove: false, updatedBoardState: board };
    }

    const updatedBoard = [...board];
    updatedBoard[position] = game.nextPlayer === 1 ? 'X' : 'O';

    return { isValidMove: true, updatedBoardState: updatedBoard };
  }

  protected async checkGameState(game: any) {
    const board = game.boardState as TicTacToeBoard;
    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(cell => cell !== '');

    return {
      isActive: !winner && !isDraw,
      isEnded: !!winner || isDraw,
      winner: winner ? (winner === 'X' ? game.player1Id : game.player2Id) : null,
      isDraw,
      boardState: board,
      currentPlayer: game.nextPlayer === 1 ? game.player1Id : game.player2Id
    };
  }

  private checkWinner(board: TicTacToeBoard): 'X' | 'O' | null {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'X' | 'O';
      }
    }

    return null;
  }

  protected validateMove(game: Game, position: number, userId: string): boolean {
    // Check if it's the player's turn
    const currentPlayerNumber = game.nextPlayer;
    const isPlayer1 = game.player1Id === userId;
    const isPlayer2 = game.player2Id === userId;
    
    if (!isPlayer1 && !isPlayer2) return false;
    if (isPlayer1 && currentPlayerNumber !== 1) return false;
    if (isPlayer2 && currentPlayerNumber !== 2) return false;

    // Check if the game is still active
    if (game.state !== 'ACTIVE') {
      return false;
    }

    // Check if the position is valid (0-8 for 3x3 grid)
    if (position < 0 || position > 8) {
      return false;
    }

    // Check if the position is empty
    const board = JSON.parse(game.boardState as string);
    const row = Math.floor(position / 3);
    const col = position % 3;
    return board[row][col] === null;
  }

  protected checkGameEnd(game: Game): { isEnded: boolean; winner: string | null } {
    const board = JSON.parse(game.boardState as string);
    
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (board[row][0] && 
          board[row][0] === board[row][1] && 
          board[row][0] === board[row][2]) {
        return { isEnded: true, winner: board[row][0] === '1' ? game.player1Id : game.player2Id };
      }
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
      if (board[0][col] && 
          board[0][col] === board[1][col] && 
          board[0][col] === board[2][col]) {
        return { isEnded: true, winner: board[0][col] === '1' ? game.player1Id : game.player2Id };
      }
    }

    // Check diagonals
    if (board[0][0] && 
        board[0][0] === board[1][1] && 
        board[0][0] === board[2][2]) {
      return { isEnded: true, winner: board[0][0] === '1' ? game.player1Id : game.player2Id };
    }

    if (board[0][2] && 
        board[0][2] === board[1][1] && 
        board[0][2] === board[2][0]) {
      return { isEnded: true, winner: board[0][2] === '1' ? game.player1Id : game.player2Id };
    }

    // Check for draw
    const isDraw = board.every((row: any[]) => 
      row.every((cell: any) => cell !== null)
    );
    if (isDraw) {
      return { isEnded: true, winner: null };
    }

    return { isEnded: false, winner: null };
  }

  protected async updateGameState(game: Game, position: number, userId: string): Promise<Game> {
    const board = JSON.parse(game.boardState as string);
    const playerNumber = game.player1Id === userId ? '1' : '2';
    const row = Math.floor(position / 3);
    const col = position % 3;
    
    // Update the board
    board[row][col] = playerNumber;

    // Update the game state
    return prisma.game.update({
      where: { id: game.id },
      data: {
        boardState: JSON.stringify(board),
        nextPlayer: game.nextPlayer === 1 ? 2 : 1
      }
    });
  }
} 