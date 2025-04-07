import React from 'react';
import BaseMultiplayerBoard from './shared/BaseMultiplayerBoard';
import { TicTacToeBoard, TicTacToeSymbol, GameStatus } from '../../types';
import Square from './Square';
import socketService from '../../services/socketService';

interface MultiplayerBoardProps {
  gameId: number;
  initialSquares: TicTacToeBoard;
  initialGameStatus: GameStatus;
  initialPlayer?: TicTacToeSymbol;
}

const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({
  gameId,
  initialSquares,
  initialGameStatus,
  initialPlayer
}) => {
  const renderTicTacToeBoard = ({ board, onMove, disabled }: { 
    board: TicTacToeBoard, 
    onMove: (index: number) => void, 
    disabled: boolean 
  }) => (
    <div className="grid grid-cols-3 gap-0 bg-white shadow-lg rounded-lg overflow-hidden">
      {board.map((square, index) => (
        <div key={index} className="flex items-center justify-center">
          <Square
            value={square}
            onClick={() => onMove(index)}
            disabled={disabled || square !== null}
          />
        </div>
      ))}
    </div>
  );

  const handleMove = (gameId: number, position: number, player: TicTacToeSymbol | 'red' | 'yellow') => {
    if (player === 'X' || player === 'O') {
      socketService.makeTicTacToeMove(gameId, position, player);
    }
  };

  return (
    <BaseMultiplayerBoard
      gameId={gameId}
      gameType="tic-tac-toe"
      initialBoard={initialSquares}
      initialGameStatus={initialGameStatus}
      initialPlayer={initialPlayer}
      onMove={handleMove}
      renderBoard={renderTicTacToeBoard}
    />
  );
};

export default MultiplayerBoard; 