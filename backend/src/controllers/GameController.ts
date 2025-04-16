import { Request, Response } from 'express';
import { prisma } from '../../prisma/prisma';

function checkWinner(board: Array<string>): 'X' | 'O' | null {
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

// Get current game for the authenticated user
export const getCurrentGame = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ message: 'getCurrentGame endpoint called' });
  } catch (error) {
    console.error('Error in getCurrentGame:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const setPlayerReady = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ message: 'setPlayerReady endpoint called' });
  } catch (error) {
    console.error('Error in setPlayerReady:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Make a move in the game
export const makeMove = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ message: 'makeMove endpoint called' });
  } catch (error) {
    console.error('Error in makeMove:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get game by ID
export const getGameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
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

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Reconstruct board state from moves
    const boardState = Array(9).fill('');
    game.moves.forEach(move => {
      boardState[move.position] = move.playerNumber === 1 ? '1' : '2';
    });

    res.json({
      id: game.id,
      boardState,
      nextPlayer: game.nextPlayer,
      state: game.state,
      player1: {
        id: game.player1.id,
        username: game.player1.username
      },
      player2: game.player2 ? {
        id: game.player2.id,
        username: game.player2.username
      } : null,
      player1Id: game.player1Id,
      player2Id: game.player2Id
    });
  } catch (error) {
    console.error('Error in getGameById:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get Connect 4 game by ID
export const getConnect4GameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const game = await prisma.game.findUnique({
      where: { id: parseInt(gameId) },
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

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Reconstruct Connect 4 board state from moves
    const boardState = Array(6).fill(null).map(() => Array(7).fill(''));
    game.moves.forEach(move => {
      let row = 5;
      while (row >= 0 && boardState[row][move.position] !== '') {
        row--;
      }
      if (row >= 0) {
        boardState[row][move.position] = move.playerNumber === 1 ? '1' : '2';
      }
    });

    res.json({
      id: game.id,
      boardState,
      nextPlayer: game.nextPlayer,
      state: game.state,
      player1: {
        id: game.player1.id,
        username: game.player1.username
      },
      player2: game.player2 ? {
        id: game.player2.id,
        username: game.player2.username
      } : null,
      player1Id: game.player1Id,
      player2Id: game.player2Id
    });
  } catch (error) {
    console.error('Error in getConnect4GameById:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 