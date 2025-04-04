import { PrismaClient } from '@prisma/client';
import { PlayerSymbol, GameStatus } from '../types';

const prisma = new PrismaClient();

export interface GameState {
  id: number;
  board: Array<Array<PlayerSymbol | null>>;
  nextPlayer: PlayerSymbol;
  gameStatus: GameStatus;
  winner: PlayerSymbol | null;
  playerRed: {
    id: string;
    username: string;
  };
  playerYellow: {
    id: string;
    username: string;
  };
  playerRedId: string;
  playerYellowId: string;
  lastMoveTimestamp: string;
  playerRedTimeRemaining: number;
  playerYellowTimeRemaining: number;
}

export async function createGame(data: {
  playerRedId: string;
  playerYellowId: string;
  gameStatus: GameStatus;
  board: Array<Array<PlayerSymbol | null>>;
  nextPlayer: PlayerSymbol;
  playerRedTimeRemaining: number;
  playerYellowTimeRemaining: number;
}): Promise<GameState> {
  const game = await prisma.connect4Game.create({
    data: {
      ...data,
      lastMoveTimestamp: new Date()
    },
    include: {
      playerRed: true,
      playerYellow: true
    }
  });

  return {
    ...game,
    board: game.board as Array<Array<PlayerSymbol | null>>,
    nextPlayer: game.nextPlayer as PlayerSymbol,
    gameStatus: game.gameStatus as GameStatus,
    winner: game.winner as PlayerSymbol | null,
    lastMoveTimestamp: game.lastMoveTimestamp.toISOString()
  };
}

export async function getGame(gameId: number): Promise<GameState | null> {
  const game = await prisma.connect4Game.findUnique({
    where: { id: gameId },
    include: {
      playerRed: true,
      playerYellow: true
    }
  });

  if (!game) return null;

  return {
    ...game,
    board: game.board as Array<Array<PlayerSymbol | null>>,
    nextPlayer: game.nextPlayer as PlayerSymbol,
    gameStatus: game.gameStatus as GameStatus,
    winner: game.winner as PlayerSymbol | null,
    lastMoveTimestamp: game.lastMoveTimestamp.toISOString()
  };
}

export async function updateGame(
  gameId: number,
  data: Partial<Omit<GameState, 'id' | 'playerRed' | 'playerYellow'>>
): Promise<GameState> {
  const game = await prisma.connect4Game.update({
    where: { id: gameId },
    data: {
      ...data,
      lastMoveTimestamp: data.lastMoveTimestamp ? new Date(data.lastMoveTimestamp) : undefined
    },
    include: {
      playerRed: true,
      playerYellow: true
    }
  });

  return {
    ...game,
    board: game.board as Array<Array<PlayerSymbol | null>>,
    nextPlayer: game.nextPlayer as PlayerSymbol,
    gameStatus: game.gameStatus as GameStatus,
    winner: game.winner as PlayerSymbol | null,
    lastMoveTimestamp: game.lastMoveTimestamp.toISOString()
  };
} 