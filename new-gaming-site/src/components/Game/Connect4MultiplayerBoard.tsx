import React from 'react';
import BaseMultiplayerBoard from './shared/BaseMultiplayerBoard';
import { Connect4Board, Connect4Symbol, GameStatus } from '../../types';
import socketService from '../../services/socketService';

interface Connect4MultiplayerBoardProps {
  gameId: number;
  initialBoard: Connect4Board;
  initialGameStatus: GameStatus;
  initialPlayer?: Connect4Symbol;
}

const Connect4MultiplayerBoard: React.FC<Connect4MultiplayerBoardProps> = ({
  gameId,
  initialBoard,
  initialGameStatus,
  initialPlayer
}) => {
  const renderConnect4Board = ({ board, onMove, disabled }: { 
    board: Connect4Board, 
    onMove: (col: number) => void, 
    disabled: boolean 
  }) => (
    <div className="flex justify-center p-1 sm:p-2">
      {board[0].map((_, col) => (
        <div key={col} className="flex flex-col">
          {board.map((row, rowIndex) => (
            <button
              key={`${rowIndex}-${col}`}
              className={`w-16 h-16 border border-gray-400 rounded-full m-1 ${
                row[col] === 'red' ? 'bg-red-500' :
                row[col] === 'yellow' ? 'bg-yellow-500' :
                'bg-white'
              }`}
              onClick={() => onMove(col)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const handleMove = (gameId: number, position: number, player: Connect4Symbol | 'X' | 'O') => {
    if (player === 'red' || player === 'yellow') {
      socketService.makeConnect4Move(gameId, position);
    }
  };

  return (
    <BaseMultiplayerBoard
      gameId={gameId}
      gameType="connect4"
      initialBoard={initialBoard}
      initialGameStatus={initialGameStatus}
      initialPlayer={initialPlayer}
      onMove={handleMove}
      renderBoard={renderConnect4Board}
    />
  );
};

export default Connect4MultiplayerBoard; 