import React from 'react';
import { TicTacToeSymbol } from '../../types';

interface SquareProps {
  value: TicTacToeSymbol | null;
  onClick: () => void;
  disabled: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, disabled }) => {
  return (
    <button 
      className={`w-20 h-20 bg-white border border-gray-400 text-4xl font-bold flex items-center justify-center ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-100'}`}
      onClick={onClick}
      disabled={disabled}
    >
      {value}
    </button>
  );
};

export default Square; 