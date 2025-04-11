import React from 'react';
import MultiplayerGameRoom from '../shared/MultiplayerGameRoom';
import Connect4Board from './Connect4Board';
import { PlayerSymbol } from './connect4Logic';

interface Connect4MultiplayerGameRoomProps {
  boardState?: any;
  onMove?: (position: number) => void;
  isActive?: boolean;
  currentPlayer?: string;
  currentUserId?: string;
}

export const Connect4MultiplayerGameRoom: React.FC<Connect4MultiplayerGameRoomProps> = ({
  boardState,
  onMove,
  isActive,
  currentPlayer,
  currentUserId
}) => {
  const handleColumnClick = (column: number) => {
    if (!isActive || currentPlayer !== currentUserId) return;
    onMove?.(column);
  };

  return (
    <MultiplayerGameRoom
      gameType="connect4"
      title="Connect 4 Multiplayer"
      onMove={onMove}
    >
      <Connect4Board
        board={boardState || Array(6).fill(null).map(() => Array(7).fill(null))}
        onColumnClick={handleColumnClick}
      />
    </MultiplayerGameRoom>
  );
};

export default Connect4MultiplayerGameRoom; 