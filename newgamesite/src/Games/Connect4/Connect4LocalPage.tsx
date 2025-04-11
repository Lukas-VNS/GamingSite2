import React from 'react';
import LocalGamePage from '../shared/LocalGamePage';
import Connect4Board from './Connect4Board';
import { PlayerSymbol, checkWinner, getLowestEmptyPosition } from './connect4Logic';

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;

const Connect4LocalPage: React.FC = () => {
  const renderConnect4Board = ({ board, onMove, disabled }: { 
    board: Array<Array<PlayerSymbol | null>>, 
    onMove: (col: number) => void, 
    disabled: boolean 
  }) => (
    <Connect4Board
      board={board}
      onColumnClick={onMove}
    />
  );

  const handleConnect4Move = (board: Array<Array<PlayerSymbol | null>>, isPlayer1Next: boolean, col: number) => {
    const newBoard = board.map(row => [...row]);
    const position = getLowestEmptyPosition(newBoard, col);
    if (position === null) return board;

    const [row, column] = position;
    newBoard[row][column] = isPlayer1Next ? 'player1' : 'player2';
    return newBoard;
  };

  const isConnect4Draw = (board: Array<Array<PlayerSymbol | null>>) => {
    return board.every(row => row.every(cell => cell !== null));
  };

  const checkConnect4Winner = (board: Array<Array<PlayerSymbol | null>>) => {
    // Convert 2D array to 1D for the checkWinner function
    const flatBoard = board.flat();
    return checkWinner(flatBoard);
  };

  return (
    <LocalGamePage
      title="Connect 4"
      gameType="connect4"
      player1Name="Red"
      player2Name="Yellow"
      player1Color="red"
      player2Color="yellow"
      initialBoard={Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))}
      renderBoard={renderConnect4Board}
      checkWinner={checkConnect4Winner}
      isDraw={isConnect4Draw}
      onMove={handleConnect4Move}
    />
  );
};

export default Connect4LocalPage; 