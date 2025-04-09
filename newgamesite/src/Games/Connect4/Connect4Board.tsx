import React from 'react';
import { PlayerSymbol } from './connect4Logic';

interface SquareProps {
  value: PlayerSymbol | null;
  onClick: () => void;
  disabled?: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, disabled }) => {
  const getColor = () => {
    if (!value) return 'bg-gray-700';
    return value === 'red' ? 'bg-red-500' : 'bg-yellow-500';
  };

  return (
    <button
      className={`w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full m-0.5 sm:m-1 ${getColor()} hover:opacity-80 transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
    />
  );
};

interface Connect4BoardProps {
  squares: Array<Array<PlayerSymbol | null>>;
  onColumnClick: (col: number) => void;
  disabled?: boolean;
}

const Connect4Board: React.FC<Connect4BoardProps> = ({ squares, onColumnClick, disabled }) => {
  const renderColumn = (col: number) => {
    return (
      <div key={col} className="flex flex-col">
        {squares.map((row, rowIndex) => (
          <Square
            key={`${rowIndex}-${col}`}
            value={row[col]}
            onClick={() => onColumnClick(col)}
            disabled={disabled}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex justify-center p-1 sm:p-2">
      {[...Array(7)].map((_, col) => renderColumn(col))}
    </div>
  );
};

export default Connect4Board; 