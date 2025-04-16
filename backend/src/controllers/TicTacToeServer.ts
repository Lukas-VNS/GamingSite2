import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { BaseGameServer } from './BaseGameServer';
import { prisma } from '../../prisma/prisma';

type TicTacToeBoard = ('1' | '2' | '')[];

export class TicTacToeServer extends BaseGameServer {
  constructor(io: Server) {
    super(io);
  }

  protected getTimeLimit(): number {
    return 60 * 1;
  }

  private convertTo2DArray(board: TicTacToeBoard): ('1' | '2' | '')[][] {
    const result: ('1' | '2' | '')[][] = [];
    for (let i = 0; i < 3; i++) {
      result.push(board.slice(i * 3, (i + 1) * 3));
    }
    return result;
  }

  protected async validateAndUpdateMove(game: Game, position: number, userId: string) {
    // Get all moves to reconstruct current board
    const moves = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { playedAt: 'asc' }
    });

    // Initialize empty board
    const board: TicTacToeBoard = Array(9).fill('');

    // Reconstruct board from moves
    moves.forEach(move => {
      board[move.position] = move.playerNumber === 1 ? '1' : '2';
    });
    
    if (position < 0 || position > 8) {
      return { isValidMove: false, updatedBoardState: this.convertTo2DArray(board) };
    }
    
    if (board[position] !== '') {
      return { isValidMove: false, updatedBoardState: this.convertTo2DArray(board) };
    }

    const updatedBoard = [...board];
    updatedBoard[position] = game.nextPlayer === 1 ? '1' : '2';

    return { isValidMove: true, updatedBoardState: this.convertTo2DArray(updatedBoard) };
  }

  protected async checkGameState(game: Game) {
    // Get the game with player relations
    const gameWithPlayers = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        player1: true,
        player2: true,
        moves: {
          orderBy: {
            playedAt: 'asc'
          }
        }
      }
    });

    if (!gameWithPlayers) {
      throw new Error('Game not found');
    }

    // Initialize empty board
    const board: TicTacToeBoard = Array(9).fill('');

    // Reconstruct board from moves
    gameWithPlayers.moves.forEach(move => {
      board[move.position] = move.playerNumber === 1 ? '1' : '2';
    });

    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(cell => cell !== '');

    // Calculate time remaining for both players
    const { player1Time, player2Time } = this.calculateTimeRemaining(gameWithPlayers, gameWithPlayers.moves);

    // Check if any player has run out of time
    let finalWinner = winner;
    let finalState = gameWithPlayers.state;
    
    if (!finalWinner && !isDraw) {
      if (player1Time <= 0) {
        finalWinner = '2';
        finalState = 'PLAYER2_WIN';
      } else if (player2Time <= 0) {
        finalWinner = '1';
        finalState = 'PLAYER1_WIN';
      }
    }

    return {
      isActive: !finalWinner && !isDraw,
      isEnded: !!finalWinner || isDraw,
      winner: finalWinner ? (finalWinner === '1' ? gameWithPlayers.player1Id : gameWithPlayers.player2Id) : null,
      isDraw,
      boardState: this.convertTo2DArray(board),
      currentPlayer: gameWithPlayers.nextPlayer === 1 ? gameWithPlayers.player1Id : gameWithPlayers.player2Id,
      player1Id: gameWithPlayers.player1Id,
      player2Id: gameWithPlayers.player2Id,
      player1: gameWithPlayers.player1,
      player2: gameWithPlayers.player2,
      state: finalState,
      nextPlayer: gameWithPlayers.nextPlayer,
      player1Time,
      player2Time
    };
  }

  private checkWinner(board: TicTacToeBoard): '1' | '2' | null {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as '1' | '2';
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

    // The actual move validation is done in validateAndUpdateMove
    return true;
  }

  protected checkGameEnd(game: Game): { isEnded: boolean; winner: string | null } {
    // The actual game end check is done in checkGameState
    return { isEnded: false, winner: null };
  }

  protected async updateGameState(game: Game, position: number, userId: string): Promise<Game> {
    const playerNumber = game.player1Id === userId ? 1 : 2;
    
    // Store the move in the database
    await prisma.move.create({
      data: {
        position,
        playerNumber,
        gameId: game.id
      }
    });

    // Get all moves to reconstruct current board
    const moves = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { playedAt: 'asc' }
    });

    // Initialize empty board
    const board: TicTacToeBoard = Array(9).fill('');

    // Reconstruct board from moves
    moves.forEach(move => {
      board[move.position] = move.playerNumber === 1 ? '1' : '2';
    });

    // Check for winner
    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(cell => cell !== '');

    // Calculate time remaining
    const { player1Time, player2Time } = this.calculateTimeRemaining(game, moves);

    // Update the game state based on the winner or time
    let newState: 'WAITING' | 'ACTIVE' | 'PLAYER1_WIN' | 'PLAYER2_WIN' | 'DRAW' = 'ACTIVE';
    if (winner) {
      newState = winner === '1' ? 'PLAYER1_WIN' : 'PLAYER2_WIN';
    } else if (isDraw) {
      newState = 'DRAW';
    } else if (player1Time <= 0) {
      newState = 'PLAYER2_WIN';
    } else if (player2Time <= 0) {
      newState = 'PLAYER1_WIN';
    }

    // Update the game state
    return prisma.game.update({
      where: { id: game.id },
      data: {
        nextPlayer: game.nextPlayer === 1 ? 2 : 1,
        state: newState
      }
    });
  }
} 