import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { games } from './gameState';

const prisma = new PrismaClient();

function checkWinner(board: Array<string>): 'X' | 'O' | null {
    const lines = [
      [0, 1, 2], // rows
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6], // columns
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8], // diagonals
      [2, 4, 6]
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
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    res.json({ message: 'Current game endpoint' });
  } catch (error) {
    console.error('Error getting current game:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join the game queue or create a new game
export const joinQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { socketId } = req.body;

    res.json({ message: 'Join queue endpoint' });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const setPlayerReady = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const gameId = parseInt(req.params.gameId);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(gameId)) {
      res.status(400).json({ message: 'Invalid game ID' });
      return;
    }

    res.json({ message: 'Set player ready endpoint' });
  } catch (error) {
    console.error('Error setting player ready:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Make a move in the game
export const makeMove = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const gameId = parseInt(req.params.gameId);
    const { position } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(gameId)) {
      res.status(400).json({ message: 'Invalid game ID' });
      return;
    }

    res.json({ message: 'Make move endpoint' });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get game by ID
export const getGameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const gameId = parseInt(req.params.gameId);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(gameId)) {
      res.status(400).json({ message: 'Invalid game ID' });
      return;
    }

    res.json({ message: 'Get game by ID endpoint' });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Connect 4 game by ID
export const getConnect4GameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const gameId = parseInt(req.params.gameId);

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isNaN(gameId)) {
      res.status(400).json({ message: 'Invalid game ID' });
      return;
    }

    res.json({ message: 'Get Connect 4 game by ID endpoint' });
  } catch (error) {
    console.error('Error getting Connect 4 game:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 