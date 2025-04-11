import React from 'react';

interface TicTacToeBoardProps {
  squares: string[];
  onClick: (index: number) => void;
  disabled: boolean;
}

const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({ squares, onClick, disabled }) => {
  const renderSquare = (index: number) => {
    return (
      <button
        className={`w-20 h-20 border-2 border-gray-300 flex items-center justify-center text-4xl font-bold
          ${squares[index] === 'X' ? 'text-blue-500' : 'text-red-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
          ${squares[index] !== '' ? 'cursor-not-allowed' : ''}`}
        onClick={() => onClick(index)}
        disabled={disabled || squares[index] !== ''}
      >
        {squares[index]}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-0 bg-white shadow-lg rounded-lg overflow-hidden">
      {Array(9).fill(null).map((_, index) => (
        <div key={index} className="flex items-center justify-center">
          {renderSquare(index)}
        </div>
      ))}
    </div>
  );
};

export default TicTacToeBoard; 