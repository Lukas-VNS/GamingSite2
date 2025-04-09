import React from 'react';
import LocalGamePage from '../shared/LocalGamePage';
import TicTacToeBoard from './TicTacToeBoard';
import { calculateWinner, isBoardFull } from './ticTacToeLogic';

const TicTacToeLocalGame: React.FC = () => {
  const renderTicTacToeBoard = ({ board, onMove, disabled }: { 
    board: string[], 
    onMove: (index: number) => void, 
    disabled: boolean 
  }) => (
    <TicTacToeBoard
      squares={board}
      onClick={onMove}
      disabled={disabled}
    />
  );

  const handleTicTacToeMove = (board: string[], isPlayer1Next: boolean, move: number) => {
    if (board[move] !== '') return board;
    
    const newBoard = [...board];
    newBoard[move] = isPlayer1Next ? 'X' : 'O';
    return newBoard;
  };

  return (
    <LocalGamePage
      title="Tic Tac Toe"
      gameType="tictactoe"
      player1Name="X"
      player2Name="O"
      player1Color="blue"
      player2Color="red"
      initialBoard={Array(9).fill('')}
      renderBoard={renderTicTacToeBoard}
      checkWinner={calculateWinner}
      isDraw={isBoardFull}
      onMove={handleTicTacToeMove}
    />
  );
};

export default TicTacToeLocalGame; 