import React from 'react';
import GameQueue from '../components/Game/shared/GameQueue';

const Connect4MultiplayerPage: React.FC = () => {
  return (
    <GameQueue
      gameType="connect4"
      gamePath="/connect4/game"
      returnPath="/connect4/multiplayer"
      title="Multiplayer Connect 4"
    />
  );
};

export default Connect4MultiplayerPage; 