import React from 'react';
import Board from '../components/Game/Board';

const GamePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">Tic Tac Toe</h1>
      <Board />
    </div>
  );
};

export default GamePage; 