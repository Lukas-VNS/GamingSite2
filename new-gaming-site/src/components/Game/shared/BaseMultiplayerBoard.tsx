import React, { useState, useEffect } from 'react';
import socketService from '../../../services/socketService';
import { GameStatus, TicTacToeSymbol, Connect4Symbol } from '../../../types';

interface BaseMultiplayerBoardProps {
  gameId: number;
  gameType: 'tic-tac-toe' | 'connect4';
  initialBoard: any;
  initialGameStatus: GameStatus;
  initialPlayer?: TicTacToeSymbol | Connect4Symbol;
  onMove: (gameId: number, position: number, player: TicTacToeSymbol | Connect4Symbol) => void;
  renderBoard: (props: {
    board: any;
    onMove: (position: number) => void;
    disabled: boolean;
  }) => React.ReactNode;
}

const BaseMultiplayerBoard: React.FC<BaseMultiplayerBoardProps> = ({
  gameId,
  gameType,
  initialBoard,
  initialGameStatus,
  initialPlayer,
  onMove,
  renderBoard
}) => {
  const [board, setBoard] = useState(initialBoard);
  const [gameStatus, setGameStatus] = useState<GameStatus>(initialGameStatus);
  const [player, setPlayer] = useState<TicTacToeSymbol | Connect4Symbol | undefined>(initialPlayer);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [playersConnected, setPlayersConnected] = useState<number>(0);
  const [amIReady, setAmIReady] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    socketService.connect();
    if (gameType === 'connect4') {
      socketService.joinConnect4Game(gameId);
    } else {
      socketService.joinTicTacToeGame(gameId);
    }
    
    socketService.onGameCreated((data) => {
      if (data.gameType === gameType) {
        setPlayer(data.player as TicTacToeSymbol | Connect4Symbol);
        setIsMyTurn(data.player === (gameType === 'tic-tac-toe' ? 'X' : 'red'));
        setPlayersConnected(2);
      }
    });
    
    socketService.onGameUpdate((data) => {
      if (data.gameType === gameType) {
        setBoard(data.board || data.squares);
        setGameStatus(data.gameStatus);
        setStatus(data.gameStatus === 'ended' ? `Game Over! ${data.winner ? `Player ${data.winner} wins!` : "It's a draw!"}` : '');
      }
    });

    socketService.onError((data: { message: string }) => {
      setStatus(data.message);
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [gameId, gameType]);

  const handleMove = (position: number) => {
    if (!player || !isMyTurn || gameStatus !== 'active') {
      return;
    }
    onMove(gameId, position, player);
  };

  const handleReady = () => {
    if (player && !amIReady && gameStatus === 'waiting') {
      console.log(`Setting player ${player} as ready`);
      setAmIReady(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {gameType === 'tic-tac-toe' ? 'Tic Tac Toe' : 'Connect 4'}
        </h1>

        {status && (
          <div className="bg-gray-700 text-white p-4 rounded-md mb-8">
            {status}
          </div>
        )}

        <div className="bg-gray-700 rounded-lg p-8 shadow-xl">
          {renderBoard({
            board,
            onMove: handleMove,
            disabled: !isMyTurn || gameStatus !== 'active'
          })}
        </div>

        {!amIReady && gameStatus === 'waiting' && (
          <button
            onClick={handleReady}
            className="mt-8 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-md transition-colors text-lg font-semibold"
          >
            Ready
          </button>
        )}
      </div>
    </div>
  );
};

export default BaseMultiplayerBoard; 