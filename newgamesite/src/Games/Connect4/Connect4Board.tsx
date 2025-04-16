import React from 'react';
import { PlayerSymbol } from './connect4Logic';

interface Connect4CellProps {
  value: PlayerSymbol | null;
  onClick: () => void;
  isWinningCell?: boolean;
}

const Connect4Cell: React.FC<Connect4CellProps> = ({ value, onClick, isWinningCell }) => {
  const getColor = () => {
    if (!value) return 'bg-black';
    return value === '1' ? 'bg-red-500' : 'bg-yellow-500';
  };

  return (
    <div
      className={`w-7 h-7 sm:w-7 sm:h-7 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-full ${getColor()} ${
        isWinningCell ? 'ring-4 ring-green-500' : ''
      } transition-colors duration-200 ease-in-out`}
      onClick={onClick}
    />
  );
};

interface Connect4BoardProps {
  board: Array<Array<PlayerSymbol | null>>;
  onColumnClick: (column: number) => void;
  winningCells?: Array<[number, number]>;
  disabled?: boolean;
}

const Connect4Board: React.FC<Connect4BoardProps> = ({ board, onColumnClick, winningCells, disabled }) => {
  // Transpose the board to render columns correctly
  const transposedBoard = board[0].map((_, colIndex) => 
    board.map(row => row[colIndex])
  );

  return (
    <div className="">
      <div className="grid grid-cols-7 gap-2">
        {transposedBoard.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`flex flex-col gap-2 cursor-pointer transition-colors duration-200 p-2 rounded ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              if (!disabled) {
                onColumnClick(colIndex);
              }
            }}
          >
            {column.map((cell, rowIndex) => (
              <Connect4Cell
                key={`${colIndex}-${rowIndex}`}
                value={cell}
                onClick={() => {}}
                isWinningCell={winningCells?.some(
                  ([winRow, winCol]) => winRow === rowIndex && winCol === colIndex
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Connect4Board; 