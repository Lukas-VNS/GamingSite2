import React from 'react';
import GameLandingPage from '../shared/GameLandingPage';

const Connect4LandingPage: React.FC = () => {
  const renderConnect4Preview = () => (
    <div className="grid grid-cols-7 gap-1 h-full">
      {[...Array(42)].map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
        >
          {i % 2 === 0 ? 'X' : ''}
        </div>
      ))}
    </div>
  );

  return (
    <GameLandingPage
      title="Connect 4"
      gameType="connect4"
      gameDescription="Drop your pieces into any column and try to connect four of your pieces horizontally, vertically, or diagonally. The first player to connect four pieces wins! Play locally with friends or challenge players online for an exciting match."
      localGamePath="/connect4/local"
      multiplayerGamePath="/connect4/multiplayerqueue"
      renderGamePreview={renderConnect4Preview}
    />
  );
};

export default Connect4LandingPage; 