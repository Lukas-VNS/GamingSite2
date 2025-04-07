import React from 'react';
import GameQueue from '../components/Game/shared/GameQueue';

const TicTacToeMultiplayerPage: React.FC = () => {
  return (
    <GameQueue
      gameType="tic-tac-toe"
      gamePath="/tic-tac-toe/game"
      returnPath="/tic-tac-toe/multiplayer"
      title="Multiplayer Tic Tac Toe"
    />
  );
};

export default TicTacToeMultiplayerPage; 