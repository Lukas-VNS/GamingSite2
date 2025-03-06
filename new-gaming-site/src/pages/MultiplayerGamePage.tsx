import React from 'react';
import MultiplayerBoard from '../components/Game/MultiplayerBoard';

const MultiplayerGamePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">Multiplayer Tic Tac Toe</h1>
      <MultiplayerBoard />
    </div>
  );
};

export default MultiplayerGamePage; 