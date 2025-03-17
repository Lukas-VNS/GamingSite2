import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { checkWinner } from '../utils/gameLogic';
import { games } from '../game/gameState';

const prisma = new PrismaClient();

// Get current game for the authenticated user
export const getCurrentGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const game = await prisma.game.findFirst({
      where: {
        OR: [
          { playerXId: userId },
          { playerOId: userId }
        ],
        NOT: {
          gameStatus: 'completed'
        }
      },
      include: {
        playerX: {
          select: {
            id: true,
            username: true
          }
        },
        playerO: {
          select: {
            id: true,
            username: true
          }
        },
        players: {
          select: {
            id: true,
            socketId: true,
            symbol: true,
            isReady: true,
            timeRemaining: true
          }
        },
        moves: {
          orderBy: {
            playedAt: 'desc'
          },
          include: {
            player: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.json({ game });
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

    if (!userId || !socketId) {
      res.status(401).json({ message: 'Unauthorized or missing socket ID' });
      return;
    }

    // Check if player is already in a game
    const existingGame = await prisma.game.findFirst({
      where: {
        OR: [
          { playerXId: userId },
          { playerOId: userId }
        ],
        NOT: {
          gameStatus: 'completed'
        }
      },
      include: {
        players: true,
        playerX: true,
        playerO: true
      }
    });

    if (existingGame) {
      res.json({ game: existingGame });
      return;
    }

    // Create new game as player X
    const newGame = await prisma.game.create({
      data: {
        squares: Array(9).fill(null),
        nextPlayer: 'X',
        gameStatus: 'waiting',
        playerXId: userId,
        playerOId: userId, // Temporarily set to same user until socket matchmaking assigns player O
        players: {
          create: {
            socketId,
            symbol: 'X',
            isReady: false,
            timeRemaining: 60
          }
        }
      },
      include: {
        playerX: true,
        playerO: true,
        players: true
      }
    });

    res.json({ game: newGame });
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

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const isPlayerX = game.playerXId === userId;
    const isPlayerO = game.playerOId === userId;

    if (!isPlayerX && !isPlayerO) {
      res.status(403).json({ message: 'Not a player in this game' });
      return;
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        ...(isPlayerX ? { playerXReady: true } : { playerOReady: true }),
        gameStatus: game.playerXReady && game.playerOReady ? 'active' : 'waiting'
      },
      include: {
        playerX: true,
        playerO: true,
        players: true
      }
    });

    res.json({ game: updatedGame });
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

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        playerX: true,
        playerO: true,
        players: true,
        moves: true
      }
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    if (game.gameStatus !== 'active') {
      res.status(400).json({ message: 'Game is not active' });
      return;
    }

    const isPlayerX = game.playerXId === userId;
    const isPlayerO = game.playerOId === userId;
    if (!isPlayerX && !isPlayerO) {
      res.status(403).json({ message: 'Not a player in this game' });
      return;
    }

    const playerSymbol = isPlayerX ? 'X' : 'O';

    if (game.nextPlayer !== playerSymbol) {
      res.status(400).json({ message: 'Not your turn' });
      return;
    }

    const board = game.squares as string[];
    if (position < 0 || position > 8 || board[position] !== null) {
      res.status(400).json({ message: 'Invalid move' });
      return;
    }

    board[position] = playerSymbol;
    
    const winner = checkWinner(board);
    const isDraw = !winner && board.every(cell => cell !== null);

    const move = await prisma.move.create({
      data: {
        position,
        symbol: playerSymbol,
        gameId: gameId,
        playerId: userId
      }
    });

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        squares: board,
        nextPlayer: playerSymbol === 'X' ? 'O' : 'X',
        gameStatus: winner || isDraw ? 'completed' : 'active',
        winner: winner || null
      },
      include: {
        playerX: true,
        playerO: true,
        players: true,
        moves: {
          orderBy: {
            playedAt: 'desc'
          },
          include: {
            player: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    res.json({ game: updatedGame });
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

    // First check if the game exists in memory
    const memoryGame = games[gameId.toString()];
    if (memoryGame) {
      // Check if the user is a player in this game
      const isPlayerX = memoryGame.playerX?.id === userId;
      const isPlayerO = memoryGame.playerO?.id === userId;

      if (!isPlayerX && !isPlayerO) {
        res.status(403).json({ message: 'Not a player in this game' });
        return;
      }

      res.json({ 
        id: gameId,
        squares: memoryGame.squares,
        nextPlayer: memoryGame.nextPlayer,
        gameStatus: memoryGame.gameStatus,
        winner: memoryGame.winner,
        playerX: memoryGame.playerX,
        playerO: memoryGame.playerO,
        playerXId: memoryGame.playerX?.id,
        playerOId: memoryGame.playerO?.id
      });
      return;
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        playerX: {
          select: {
            id: true,
            username: true
          }
        },
        playerO: {
          select: {
            id: true,
            username: true
          }
        },
        players: {
          select: {
            id: true,
            socketId: true,
            symbol: true,
            isReady: true,
            timeRemaining: true
          }
        }
      }
    });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Check if the user is a player in this game
    const isPlayerX = game.playerX?.id === userId;
    const isPlayerO = game.playerO?.id === userId;

    if (!isPlayerX && !isPlayerO) {
      res.status(403).json({ message: 'Not a player in this game' });
      return;
    }

    res.json({ 
      game,
      playerXId: game.playerX?.id,
      playerOId: game.playerO?.id
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 