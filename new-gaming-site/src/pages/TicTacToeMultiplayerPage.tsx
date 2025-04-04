import React from 'react';
import GameQueue from '../components/Game/GameQueue';

const TicTacToeMultiplayerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Tic Tac Toe Multiplayer
        </h1>
        
        <GameQueue
          gameType="tic-tac-toe"
          gamePath="/tic-tac-toe/game"
          returnPath="/tic-tac-toe/multiplayer"
        />
      </div>
    </div>
  );
};

export default TicTacToeMultiplayerPage; 