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
        className={`w-24 h-24 bg-black border-2 border-gray-700 flex items-center justify-center text-4xl font-bold
          ${squares[index] === '2' ? 'text-blue-500' : 'text-red-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-900'}
          ${squares[index] !== '' ? 'cursor-not-allowed' : ''}`}
        onClick={() => onClick(index)}
        disabled={disabled || squares[index] !== ''}
      >
        {squares[index] === '2' ? 'O' : 
        squares[index] === '1' ? 'X' : ''}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-4 bg-gray-800 rounded-lg shadow-xl">
      {Array(9).fill(null).map((_, index) => (
        <div key={index} className="flex items-center justify-center">
          {renderSquare(index)}
        </div>
      ))}
    </div>
  );
};

export default TicTacToeBoard; 