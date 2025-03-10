import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface GameStats {
  playerX: number;
  playerO: number;
  draws: number;
}

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [board, setBoard] = useState<Array<string>>(Array(9).fill(''));
  const [isXNext, setIsXNext] = useState(true);
  const [xStarts, setXStarts] = useState(true); // Track who starts each game
  const [stats, setStats] = useState<GameStats>({
    playerX: 0,
    playerO: 0,
    draws: 0
  });
  const [gameEnded, setGameEnded] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
    setBoard(Array(9).fill(''));
    setIsXNext(true); // X always starts first game
    setXStarts(true);
    setGameEnded(false);
  };

  const handleNextGame = () => {
    setBoard(Array(9).fill(''));
    const nextStarter = !xStarts; // Flip starting player
    setXStarts(nextStarter);
    setIsXNext(nextStarter); // Set current player to new starter
    setGameEnded(false);
  };

  const calculateWinner = (squares: string[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    if (board[index] || gameEnded) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const winner = calculateWinner(newBoard);
    const isDraw = !winner && newBoard.every(square => square !== '');

    if (winner || isDraw) {
      setGameEnded(true);
      setStats(prevStats => ({
        ...prevStats,
        ...(winner === 'X' ? { playerX: prevStats.playerX + 1 } :
            winner === 'O' ? { playerO: prevStats.playerO + 1 } :
            { draws: prevStats.draws + 1 })
      }));
    } else {
      setIsXNext(!isXNext);
    }
  };

  const getGameStatus = () => {
    const winner = calculateWinner(board);
    if (winner) {
      return `Winner: ${winner}`;
    }
    if (board.every(square => square !== '')) {
      return "It's a draw!";
    }
    return `Next player: ${isXNext ? 'X' : 'O'}`;
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Local Tic Tac Toe</h1>
          <button
            onClick={handleStartGame}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Game Board */}
          <div className="bg-gray-700 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-center">Game Board</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {board.map((square, index) => (
                <button
                  key={index}
                  className={`aspect-square bg-gray-600 rounded-md flex items-center justify-center text-3xl font-bold
                    ${!square && !gameEnded ? 'hover:bg-gray-500' : ''} transition-colors`}
                  onClick={() => handleClick(index)}
                  disabled={!!square || gameEnded}
                >
                  <span className={square === 'X' ? 'text-blue-400' : 'text-red-400'}>
                    {square}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-center mb-4">
              <p className="text-xl font-semibold">{getGameStatus()}</p>
            </div>
            {gameEnded && (
              <div className="space-y-2">
                <button
                  onClick={handleNextGame}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors"
                >
                  Next Game ({!xStarts ? 'X' : 'O'} Starts)
                </button>
              </div>
            )}
          </div>

          {/* Stats Board */}
          <div className="bg-gray-700 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-center">Game Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-600 p-3 rounded-md">
                <span className="text-blue-400 font-bold">Player X</span>
                <span className="text-2xl font-bold">{stats.playerX}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-600 p-3 rounded-md">
                <span className="text-red-400 font-bold">Player O</span>
                <span className="text-2xl font-bold">{stats.playerO}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-600 p-3 rounded-md">
                <span className="text-gray-300 font-bold">Draws</span>
                <span className="text-2xl font-bold">{stats.draws}</span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate('/tictactoe')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md transition-colors"
              >
                Back to Game Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage; 