import React from 'react';
import LocalGamePage from '../components/Game/shared/LocalGamePage';
import Connect4Board from '../components/Game/Connect4Board';
import { PlayerSymbol, checkWinner, getLowestEmptyPosition } from '../game/connect4Logic';

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;

const Connect4LocalPage: React.FC = () => {
  const renderConnect4Board = ({ board, onMove, disabled }: { 
    board: Array<Array<PlayerSymbol | null>>, 
    onMove: (col: number) => void, 
    disabled: boolean 
  }) => (
    <Connect4Board
      squares={board}
      onColumnClick={onMove}
      disabled={disabled}
    />
  );

  const handleConnect4Move = (board: Array<Array<PlayerSymbol | null>>, isPlayer1Next: boolean) => {
    const newBoard = board.map(row => [...row]);
    const col = board[0].findIndex((cell, index) => board.every(row => row[index] === null));
    if (col === -1) return board;

    const position = getLowestEmptyPosition(newBoard, col);
    if (position === null) return board;

    const [row, column] = position;
    newBoard[row][column] = isPlayer1Next ? 'red' : 'yellow';
    return newBoard;
  };

  const isConnect4Draw = (board: Array<Array<PlayerSymbol | null>>) => {
    return board.every(row => row.every(cell => cell !== null));
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
      checkWinner={(board) => checkWinner(board.flat())}
      isDraw={isConnect4Draw}
      onMove={handleConnect4Move}
    />
  );
};

export default Connect4LocalPage; 