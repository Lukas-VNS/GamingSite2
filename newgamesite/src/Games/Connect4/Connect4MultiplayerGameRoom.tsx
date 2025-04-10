import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameState, PlayerSymbol, GameStatus } from './connect4Logic';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';

export const Connect4MultiplayerGameRoom: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    // TODO: Implement socket connection and game state updates
    // This will be added when we implement multiplayer functionality
  }, [gameId, navigate]);

  const handleMove = (column: number) => {
    if (!gameState || gameState.gameStatus !== 'active') return;
    // TODO: Implement move handling with socket service
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  const gameStatus = {
    isActive: gameState.gameStatus === 'active',
    isEnded: gameState.gameStatus === 'ended' || gameState.gameStatus === 'draw',
    isDraw: gameState.gameStatus === 'draw',
    winner: gameState.winner,
    currentPlayer: gameState.nextPlayer,
    player1: {
      id: gameState.playerRedId,
      username: gameState.playerRed.username,
      timeRemaining: gameState.playerRedTimeRemaining
    },
    player2: {
      id: gameState.playerYellowId,
      username: gameState.playerYellow.username,
      timeRemaining: gameState.playerYellowTimeRemaining
    }
  };

  return (
    <MultiplayerGameRoom
      gameType="connect4"
      title="Connect 4 Multiplayer"
      gameStatus={gameStatus}
      onMove={handleMove}
    >
      <div className="connect4-board">
        {gameState.board.map((column, colIndex) => (
          <div
            key={colIndex}
            className="connect4-column"
            onClick={() => handleMove(colIndex)}
          >
            {column.map((cell, rowIndex) => (
              <div
                key={`${colIndex}-${rowIndex}`}
                className={`connect4-cell ${cell || 'empty'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </MultiplayerGameRoom>
  );
};

export default Connect4MultiplayerGameRoom; 