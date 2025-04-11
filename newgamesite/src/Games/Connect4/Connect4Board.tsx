import React from 'react';
import { PlayerSymbol } from './connect4Logic';

interface Connect4CellProps {
  value: PlayerSymbol | null;
  onClick: () => void;
  isWinningCell?: boolean;
}

const Connect4Cell: React.FC<Connect4CellProps> = ({ value, onClick, isWinningCell }) => {
  const getColor = () => {
    if (!value) return 'bg-gray-700';
    return value === 'player1' ? 'bg-red-500' : 'bg-yellow-500';
  };

  return (
    <div
      className={`w-16 h-16 rounded-full ${getColor()} ${
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
}

const Connect4Board: React.FC<Connect4BoardProps> = ({ board, onColumnClick, winningCells }) => {
  return (
    <div className="bg-blue-600 p-4 rounded-lg shadow-lg">
      <div className="grid grid-cols-7 gap-2">
        {board.map((column, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-col-reverse gap-2 cursor-pointer hover:bg-blue-500 transition-colors duration-200 p-2 rounded"
            onClick={() => onColumnClick(colIndex)}
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