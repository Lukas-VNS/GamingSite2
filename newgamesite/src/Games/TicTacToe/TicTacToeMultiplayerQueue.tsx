import React from 'react';
import GameQueue from '../shared/GameQueue';

const TicTacToeMultiplayerQueue: React.FC = () => {
  return (
    <GameQueue
      gameType="tictactoe"
      gamePath="/tictactoe/game"
      returnPath="/tictactoe/multiplayerqueue"
      title="Multiplayer Tic Tac Toe"
    />
  );
};

export default TicTacToeMultiplayerQueue; 