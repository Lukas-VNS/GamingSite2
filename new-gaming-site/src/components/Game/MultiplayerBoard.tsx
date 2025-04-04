import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/socketService';
import { GameStatus, TicTacToeSymbol, TicTacToeBoard } from '../../types';
import Square from './Square';

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
  const [squares, setSquares] = useState<TicTacToeBoard>(initialSquares);
  const [gameStatus, setGameStatus] = useState<GameStatus>(initialGameStatus);
  const [player, setPlayer] = useState<TicTacToeSymbol | undefined>(initialPlayer);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [playersConnected, setPlayersConnected] = useState<number>(0);
  const [amIReady, setAmIReady] = useState<boolean>(false);
  const [readyStatus, setReadyStatus] = useState<{ X: boolean; O: boolean }>({ X: false, O: false });
  const [timers, setTimers] = useState<{ X: number; O: number }>({ X: 300, O: 300 });
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    socketService.connect();
    socketService.joinTicTacToeGame(gameId);
    
    socketService.onTicTacToePlayerAssigned((data) => {
      setPlayer(data.player);
      setIsMyTurn(data.player === 'X');
      setPlayersConnected(2);
    });
    
    socketService.onTicTacToeGameUpdate((data) => {
      setSquares(data.squares);
      setGameStatus(data.gameStatus);
      setStatus(data.gameStatus === 'ended' ? `Game Over! ${data.winner ? `Player ${data.winner} wins!` : "It's a draw!"}` : '');
    });

    socketService.onTicTacToeError((data) => {
      setStatus(data.message);
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [gameId]);

  const handleClick = (i: number) => {
    if (!player || !isMyTurn || gameStatus !== 'active' || squares[i]) {
      return;
    }
    
    socketService.makeTicTacToeMove(gameId, i, player);
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
        {squares.map((square, i) => (
          <Square
            key={i}
            value={square}
            onClick={() => handleClick(i)}
            disabled={!isMyTurn || gameStatus !== 'active'}
          />
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

export default MultiplayerBoard; 