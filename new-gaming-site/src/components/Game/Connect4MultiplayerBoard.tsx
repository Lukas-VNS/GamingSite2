import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import { GameStatus, Connect4Symbol, Connect4Board } from '../../types';

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
  const [board, setBoard] = useState<Connect4Board>(initialBoard);
  const [gameStatus, setGameStatus] = useState<GameStatus>(initialGameStatus);
  const [player, setPlayer] = useState<Connect4Symbol | undefined>(initialPlayer);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [playersConnected, setPlayersConnected] = useState<number>(0);
  const [amIReady, setAmIReady] = useState<boolean>(false);
  const [readyStatus, setReadyStatus] = useState<{ red: boolean; yellow: boolean }>({ red: false, yellow: false });
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    socketService.connect();
    socketService.joinConnect4Game(gameId);
    
    socketService.onConnect4PlayerAssigned((data) => {
      setPlayer(data.player);
      setIsMyTurn(data.player === 'red');
      setPlayersConnected(2);
    });
    
    socketService.onConnect4GameUpdate((data) => {
      setBoard(data.board);
      setGameStatus(data.gameStatus);
      setStatus(data.gameStatus === 'ended' ? `Game Over! ${data.winner ? `Player ${data.winner} wins!` : "It's a draw!"}` : '');
    });

    socketService.onConnect4Error((data) => {
      setStatus(data.message);
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [gameId]);

  const handleColumnClick = (col: number) => {
    if (!gameId || !player) {
      return;
    }

    socketService.makeConnect4Move(gameId, col);
  };

  const handleReady = () => {
    if (player && !amIReady && gameStatus === 'waiting') {
      console.log(`Setting player ${player} as ready`);
      setAmIReady(true);
    }
  };

  const handleReset = () => {
    setAmIReady(false);
  };

  return (
    <div className="game-board">
      <div className="status">{status}</div>
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={`w-16 h-16 border border-gray-400 rounded-full m-1 ${
                  cell === 'red' ? 'bg-red-500' :
                  cell === 'yellow' ? 'bg-yellow-500' :
                  'bg-white'
                }`}
                onClick={() => handleColumnClick(colIndex)}
                disabled={!isMyTurn || gameStatus !== 'active'}
              />
            ))}
          </div>
        ))}
      </div>
      {!amIReady && gameStatus === 'waiting' && (
        <button onClick={handleReady}>Ready</button>
      )}
      {gameStatus === 'ended' && (
        <button onClick={handleReset}>Play Again</button>
      )}
    </div>
  );
};

export default Connect4MultiplayerBoard; 