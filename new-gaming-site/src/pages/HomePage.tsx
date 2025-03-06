import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Welcome to Gaming Site</h1>
      <div className="flex flex-col gap-4 w-64">
        <Link
          to="/tictactoe"
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg text-center font-medium transition-colors"
        >
          Play Tic Tac Toe (Local)
        </Link>
        <Link
          to="/tictactoe/multiplayer"
          className="bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg text-center font-medium transition-colors"
        >
          Play Tic Tac Toe (Online)
        </Link>
      </div>
    </div>
  );
};

export default HomePage; 