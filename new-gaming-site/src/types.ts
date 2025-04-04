// Common types
export type GameStatus = 'waiting' | 'active' | 'ended' | 'draw';

// Tic Tac Toe specific types
export type TicTacToeSymbol = 'X' | 'O';
export type TicTacToeBoard = Array<TicTacToeSymbol | null>;

// Connect 4 specific types
export type Connect4Symbol = 'red' | 'yellow';
export type Connect4Board = Array<Array<Connect4Symbol | null>>;

// Union type for all player symbols (used in components that need to handle both games)
export type PlayerSymbol = TicTacToeSymbol | Connect4Symbol; 