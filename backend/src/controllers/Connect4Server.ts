import { Server } from 'socket.io';
import { Game } from '@prisma/client';
import { BaseGameServer } from './BaseGameServer';
import { prisma } from '../../prisma/prisma';

type Connect4Board = ('1' | '2' | '')[][];

export class Connect4Server extends BaseGameServer {
  constructor(io: Server) {
    super(io);
  }

  protected getTimeLimit(): number {
    return 60 * 3;
  }

  protected async validateAndUpdateMove(game: Game, position: number, userId: string) {
    // Get all moves to reconstruct current board
    const moves = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { playedAt: 'asc' }
    });

    // Initialize empty board
    const board: Connect4Board = Array(6).fill(null).map(() => Array(7).fill(''));

    // Reconstruct board from moves
    moves.forEach(move => {
      let row = 5;
      while (row >= 0 && board[row][move.position] !== '') {
        row--;
      }
      if (row >= 0) {
        board[row][move.position] = move.playerNumber === 1 ? '1' : '2';
      }
    });
    
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
    updatedBoard[row][position] = game.nextPlayer === 1 ? '1' : '2';

    return { isValidMove: true, updatedBoardState: updatedBoard };
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
    const board: Connect4Board = Array(6).fill(null).map(() => Array(7).fill(''));

    // Reconstruct board from moves
    gameWithPlayers.moves.forEach(move => {
      let row = 5;
      while (row >= 0 && board[row][move.position] !== '') {
        row--;
      }
      if (row >= 0) {
        board[row][move.position] = move.playerNumber === 1 ? '1' : '2';
      }
    });

    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(row => row.every(cell => cell !== ''));

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
      boardState: board,
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

  private checkWinner(board: Connect4Board): '1' | '2' | null {
    // Check horizontal
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row][col + 1] && cell === board[row][col + 2] && cell === board[row][col + 3]) {
          return cell as '1' | '2';
        }
      }
    }

    // Check vertical
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 7; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col] && cell === board[row + 2][col] && cell === board[row + 3][col]) {
          return cell as '1' | '2';
        }
      }
    }

    // Check diagonal (down-right)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col + 1] && cell === board[row + 2][col + 2] && cell === board[row + 3][col + 3]) {
          return cell as '1' | '2';
        }
      }
    }

    // Check diagonal (down-left)
    for (let row = 0; row < 3; row++) {
      for (let col = 3; col < 7; col++) {
        const cell = board[row][col];
        if (cell && cell === board[row + 1][col - 1] && cell === board[row + 2][col - 2] && cell === board[row + 3][col - 3]) {
          return cell as '1' | '2';
        }
      }
    }

    return null;
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
    const board: Connect4Board = Array(6).fill(null).map(() => Array(7).fill(''));

    // Reconstruct board from moves
    moves.forEach(move => {
      let row = 5;
      while (row >= 0 && board[row][move.position] !== '') {
        row--;
      }
      if (row >= 0) {
        board[row][move.position] = move.playerNumber === 1 ? '1' : '2';
      }
    });

    // Check for winner
    const winner = this.checkWinner(board);
    const isDraw = !winner && board.every(row => row.every(cell => cell !== ''));

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

  // Legacy methods to satisfy the abstract class requirements
  protected validateMove(game: Game, position: number, userId: string): boolean {
    return true; // This is now handled in validateAndUpdateMove
  }

  protected checkGameEnd(game: Game): { isEnded: boolean; winner: string | null } {
    return { isEnded: false, winner: null }; // This is now handled in checkGameState
  }
} 