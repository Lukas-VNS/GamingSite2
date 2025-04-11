import React from 'react';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';
import TicTacToeBoard from './TicTacToeBoard';
import { PlayerSymbol } from './ticTacToeLogic';

interface TicTacToeMultiplayerGameRoomProps {
  boardState?: any;
  onMove?: (position: number) => void;
  isActive?: boolean;
  currentPlayer?: string;
  currentUserId?: string;
}

export const TicTacToeMultiplayerGameRoom: React.FC<TicTacToeMultiplayerGameRoomProps> = ({
  boardState,
  onMove,
  isActive,
  currentPlayer,
  currentUserId
}) => {
  const handleSquareClick = (position: number) => {
    if (!isActive || currentPlayer !== currentUserId) return;
    onMove?.(position);
  };

  return (
    <MultiplayerGameRoom
      gameType="tictactoe"
      title="Tic Tac Toe Multiplayer"
      onMove={onMove}
    >
      <TicTacToeBoard
        squares={boardState || Array(9).fill('')}
        onClick={handleSquareClick}
        disabled={!isActive || currentPlayer !== currentUserId}
      />
    </MultiplayerGameRoom>
  );
};

export default TicTacToeMultiplayerGameRoom;