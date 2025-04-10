import React from 'react';
import GameQueue from '../shared/GameQueue';

const Connect4MultiplayerPageQueue: React.FC = () => {
  return (
    <GameQueue
      gameType="connect4"
      gamePath="/connect4/multiplayer/game"
      returnPath="/connect4/multiplayerqueue"
      title="Multiplayer Connect 4"
    />
  );
};

export default Connect4MultiplayerPageQueue; 