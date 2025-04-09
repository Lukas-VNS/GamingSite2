import React from 'react';
import GameLandingPage from '../shared/GameLandingPage';

const TicTacToePage: React.FC = () => {
  const renderTicTacToePreview = () => (
    <div className="grid grid-cols-3 gap-2 h-full">
      {[...Array(9)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold"
        >
          {i % 3 === 0 ? 'X' : i % 3 === 1 ? 'O' : ''}
        </div>
      ))}
    </div>
  );

  return (
    <GameLandingPage
      title="Tic Tac Toe"
      gameType="tictactoe"
      gameDescription="Get three in a row horizontally, vertically, or diagonally to win! Take turns placing your mark (X or O) on the board. Play locally with friends or challenge players online for an exciting match."
      localGamePath="/tictactoe/local"
      multiplayerGamePath="/tictactoe/multiplayerqueue"
      renderGamePreview={renderTicTacToePreview}
    />
  );
};

export default TicTacToePage; 