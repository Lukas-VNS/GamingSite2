import React, { useState, useEffect } from 'react';
import socketService from '../../services/socketService';

type SquareValue = 'X' | 'O' | null;

interface SquareProps {
  value: SquareValue;
  onClick: () => void;
  disabled: boolean;
}

const Square: React.FC<SquareProps> = ({ value, onClick, disabled }) => {
  return (
    <button 
      className={`w-20 h-20 bg-white border border-gray-400 text-4xl font-bold flex items-center justify-center ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-100'}`}
      onClick={onClick}
      disabled={disabled}
    >
      {value}
    </button>
  );
};

// Helper to format seconds as MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const MultiplayerBoard: React.FC = () => {
  const [squares, setSquares] = useState<SquareValue[]>(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [player, setPlayer] = useState<'X' | 'O' | null>(null);
  const gameId = 'game1'; // Simple fixed game room
  const [status, setStatus] = useState<string>('Connecting...');
  const [playersConnected, setPlayersConnected] = useState<number>(0);
  const [timers, setTimers] = useState<{ X: number; O: number }>({ X: 300, O: 300 });
  const [gameStatus, setGameStatus] = useState<'active' | 'ended' | 'draw'>('active');
  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [winReason, setWinReason] = useState<'timeout' | 'disconnect' | 'normal' | null>(null);

  useEffect(() => {
    // Connect to socket.io server
    socketService.connect();
    
    // Join a game room
    socketService.joinGame(gameId);
    
    // Handle player assignment
    socketService.onPlayerAssigned((data) => {
      setPlayer(data.player);
      setIsMyTurn(data.player === 'X'); // X goes first
      setPlayersConnected(data.playersConnected);
      setGameStatus(data.gameStatus);
      setWinner(data.winner);
      
      updateGameStatus(data.gameStatus, data.winner, player);
    });
    
    // Handle player count updates
    socketService.onPlayersUpdate((data) => {
      setPlayersConnected(data.count);
      if (data.count < 2 && gameStatus === 'active') {
        setStatus('Waiting for opponent...');
      }
    });
    
    // Listen for timer updates
    socketService.onTimerUpdate((data) => {
      setTimers(data.timers);
    });
    
    // Listen for game updates
    socketService.onGameUpdate((data) => {
      setSquares(data.squares);
      setTimers(data.timers);
      setGameStatus(data.gameStatus);
      setWinner(data.winner);
      setIsMyTurn(data.nextPlayer === player);
      setWinReason(data.winReason || 'normal');
      
      updateGameStatus(data.gameStatus, data.winner, player, data.winReason);
    });
    
    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [gameId, player, gameStatus, winner]);
  
  // Helper function to update game status message
  const updateGameStatus = (
    status: 'active' | 'ended' | 'draw', 
    winner: 'X' | 'O' | null, 
    currentPlayer: 'X' | 'O' | null,
    reason?: 'timeout' | 'disconnect'
  ) => {
    if (status === 'active') {
      if (playersConnected < 2) {
        setStatus('Waiting for opponent...');
      } else if (currentPlayer === 'X') {
        setStatus(isMyTurn ? 'Your turn' : "Opponent's turn");
      } else if (currentPlayer === 'O') {
        setStatus(isMyTurn ? 'Your turn' : "Opponent's turn");
      }
    } else if (status === 'ended') {
      if (winner === currentPlayer) {
        setStatus('You Win!');
      } else {
        if (reason === 'timeout') {
          setStatus('You lost - time ran out!');
        } else if (reason === 'disconnect') {
          setStatus('Opponent disconnected - You win!');
        } else {
          setStatus('You lost!');
        }
      }
    } else if (status === 'draw') {
      setStatus('Draw!');
    }
  };

  const handleClick = (i: number) => {
    if (!isMyTurn || !player || gameStatus !== 'active' || calculateWinner(squares) || squares[i]) {
      return;
    }
    
    // Emit move to server
    socketService.makeMove(gameId, i, player);
  };

  const handleReset = () => {
    socketService.resetGame(gameId);
  };

  const renderSquare = (i: number) => {
    return (
      <Square 
        value={squares[i]} 
        onClick={() => handleClick(i)}
        disabled={!isMyTurn || gameStatus !== 'active' || !!squares[i]} 
      />
    );
  };

  // Helper function to calculate winner (for UI purposes)
  const calculateWinner = (squares: SquareValue[]): SquareValue => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-xl font-bold mb-2">Game ID: {gameId}</div>
      <div className="text-lg mb-1">
        {player ? `You are: ${player}` : 'Connecting...'}
      </div>
      <div className="text-md mb-2">Players connected: {playersConnected}/2</div>
      
      {/* Timer display */}
      <div className="flex justify-between w-64 mb-4">
        <div className={`px-4 py-2 rounded ${player === 'X' ? 'bg-blue-100 border border-blue-500' : 'bg-gray-100'}`}>
          X: {formatTime(timers.X)}
        </div>
        <div className={`px-4 py-2 rounded ${player === 'O' ? 'bg-red-100 border border-red-500' : 'bg-gray-100'}`}>
          O: {formatTime(timers.O)}
        </div>
      </div>
      
      <div className={`text-xl font-bold mb-4 ${isMyTurn && gameStatus === 'active' ? 'text-green-600' : 'text-red-600'}`}>
        {status}
      </div>
      
      <div className="grid grid-cols-3 gap-1 mb-6">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i}>{renderSquare(i)}</div>
        ))}
      </div>
      
      {/* Reset game button - only show when game is over */}
      {(gameStatus === 'ended' || gameStatus === 'draw') && (
        <button 
          onClick={handleReset}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg font-medium transition-colors"
        >
          Play Again
        </button>
      )}
      
      {/* Disconnect warning */}
      {playersConnected < 2 && gameStatus === 'active' && (
        <div className="mt-4 text-amber-600 font-medium">
          {player === 'X' ? 'Player O' : 'Player X'} disconnected. 
          They have 30 seconds to reconnect or they will forfeit.
        </div>
      )}
    </div>
  );
};

export default MultiplayerBoard; 