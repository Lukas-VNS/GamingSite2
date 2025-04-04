import React from 'react';
import GameQueue from '../components/Game/GameQueue';

const Connect4MultiplayerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Connect 4 Multiplayer
        </h1>
        
        <GameQueue
          gameType="connect4"
          gamePath="/connect4/game"
          returnPath="/connect4/multiplayer"
        />
      </div>
    </div>
  );
};

export default Connect4MultiplayerPage; 