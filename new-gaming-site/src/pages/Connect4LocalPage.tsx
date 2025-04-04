import React, { useState } from 'react';
import Connect4Board from '../components/Game/Connect4Board';
import { PlayerSymbol, checkWinner, getLowestEmptyPosition } from '../game/connect4Logic';

interface GameStats {
  playerRed: number;
  playerYellow: number;
  draws: number;
}

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;

const Connect4LocalPage: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [board, setBoard] = useState<Array<Array<PlayerSymbol | null>>>(
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [isRedNext, setIsRedNext] = useState(true);
  const [redStarts, setRedStarts] = useState(true);
  const [stats, setStats] = useState<GameStats>({
    playerRed: 0,
    playerYellow: 0,
    draws: 0
  });
  const [gameEnded, setGameEnded] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setIsRedNext(true);
    setRedStarts(true);
    setGameEnded(false);
  };

  const handleNextGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    const nextStarter = !redStarts;
    setRedStarts(nextStarter);
    setIsRedNext(nextStarter);
    setGameEnded(false);
  };

  const handleColumnClick = (col: number) => {
    if (gameEnded) return;

    const position = getLowestEmptyPosition(board, col);
    if (position === null) return;

    const [row, column] = position;
    const newBoard = board.map(row => [...row]);
    newBoard[row][column] = isRedNext ? 'red' : 'yellow';
    setBoard(newBoard);

    const winner = checkWinner(newBoard.flat());
    const isDraw = !winner && newBoard.every(row => row.every(cell => cell !== null));

    if (winner || isDraw) {
      setGameEnded(true);
      setStats(prevStats => ({
        ...prevStats,
        ...(winner === 'red' ? { playerRed: prevStats.playerRed + 1 } :
            winner === 'yellow' ? { playerYellow: prevStats.playerYellow + 1 } :
            { draws: prevStats.draws + 1 })
      }));
    } else {
      setIsRedNext(!isRedNext);
    }
  };

  const getGameStatus = () => {
    const winner = checkWinner(board.flat());
    if (winner) {
      return `Winner: ${winner === 'red' ? 'Red' : 'Yellow'}`;
    }
    if (board.every(row => row.every(cell => cell !== null))) {
      return "It's a draw!";
    }
    return `Next player: ${isRedNext ? 'Red' : 'Yellow'}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Connect 4
          </h1>
          <div className="text-xl mb-4">{getGameStatus()}</div>
        </div>

        <div className="flex justify-center mb-8">
          <Connect4Board
            squares={board}
            onColumnClick={handleColumnClick}
            disabled={!gameStarted || gameEnded}
          />
        </div>

        <div className="text-center">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-lg font-bold mb-2 text-red-500">Red Player</div>
              <div className="text-sm text-gray-300">Wins: {stats.playerRed}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-lg font-bold mb-2 text-yellow-500">Yellow Player</div>
              <div className="text-sm text-gray-300">Wins: {stats.playerYellow}</div>
            </div>
          </div>

          <div className="space-x-4">
            {!gameStarted ? (
              <button
                onClick={handleStartGame}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md transition-colors"
              >
                Start Game
              </button>
            ) : (
              <>
                {(gameEnded || board.every(row => row.every(cell => cell !== null))) && (
                  <button
                    onClick={handleNextGame}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md transition-colors"
                  >
                    Next Game
                  </button>
                )}
                <button
                  onClick={handleStartGame}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
                >
                  Reset Game
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connect4LocalPage; 