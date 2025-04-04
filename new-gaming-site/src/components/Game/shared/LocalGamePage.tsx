import React, { useState } from 'react';

interface GameStats {
  player1: number;
  player2: number;
  draws: number;
}

interface LocalGamePageProps {
  title: string;
  gameType: 'tictactoe' | 'connect4';
  player1Name: string;
  player2Name: string;
  player1Color: string;
  player2Color: string;
  initialBoard: any;
  renderBoard: (props: {
    board: any;
    onMove: (move: any) => void;
    disabled: boolean;
  }) => React.ReactNode;
  checkWinner: (board: any) => string | null;
  isDraw: (board: any) => boolean;
  onMove: (board: any, isPlayer1Next: boolean, move: any) => any;
}

const LocalGamePage: React.FC<LocalGamePageProps> = ({
  title,
  gameType,
  player1Name,
  player2Name,
  player1Color,
  player2Color,
  initialBoard,
  renderBoard,
  checkWinner,
  isDraw,
  onMove
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [board, setBoard] = useState(initialBoard);
  const [isPlayer1Next, setIsPlayer1Next] = useState(true);
  const [player1Starts, setPlayer1Starts] = useState(true);
  const [stats, setStats] = useState<GameStats>({
    player1: 0,
    player2: 0,
    draws: 0
  });
  const [gameEnded, setGameEnded] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
    setBoard(initialBoard);
    setIsPlayer1Next(true);
    setPlayer1Starts(true);
    setGameEnded(false);
  };

  const handleNextGame = () => {
    setBoard(initialBoard);
    const nextStarter = !player1Starts;
    setPlayer1Starts(nextStarter);
    setIsPlayer1Next(nextStarter);
    setGameEnded(false);
  };

  const handleMove = (move: any) => {
    if (gameEnded) return;

    const newBoard = onMove(board, isPlayer1Next, move);
    setBoard(newBoard);

    const winner = checkWinner(newBoard);
    const isGameDraw = isDraw(newBoard);

    if (winner || isGameDraw) {
      setGameEnded(true);
      setStats(prevStats => ({
        ...prevStats,
        ...(winner === player1Name ? { player1: prevStats.player1 + 1 } :
            winner === player2Name ? { player2: prevStats.player2 + 1 } :
            { draws: prevStats.draws + 1 })
      }));
    } else {
      setIsPlayer1Next(!isPlayer1Next);
    }
  };

  const getGameStatus = () => {
    const winner = checkWinner(board);
    if (winner) {
      return `Winner: ${winner === player1Name ? player1Name : player2Name}`;
    }
    if (isDraw(board)) {
      return "It's a draw!";
    }
    return `Next player: ${isPlayer1Next ? player1Name : player2Name}`;
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Local {title}</h1>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            {title}
          </h1>
          <div className="text-xl mb-4">{getGameStatus()}</div>
        </div>

        <div className="flex justify-center mb-8">
          {renderBoard({
            board,
            onMove: handleMove,
            disabled: !gameStarted || gameEnded
          })}
        </div>

        <div className="text-center">
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className={`text-lg font-bold mb-2 text-${player1Color}-500`}>{player1Name}</div>
              <div className="text-sm text-gray-300">Wins: {stats.player1}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className={`text-lg font-bold mb-2 text-${player2Color}-500`}>{player2Name}</div>
              <div className="text-sm text-gray-300">Wins: {stats.player2}</div>
            </div>
          </div>

          <div className="space-x-4">
            {(gameEnded || isDraw(board)) && (
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalGamePage; 