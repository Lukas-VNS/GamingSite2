import React, { useState } from 'react';

type SquareValue = 'X' | 'O' | null;

interface SquareProps {
  value: SquareValue;
  onClick: () => void;
}

const Square: React.FC<SquareProps> = ({ value, onClick }) => {
  return (
    <button 
      className="w-20 h-20 bg-white border border-gray-400 text-4xl font-bold flex items-center justify-center"
      onClick={onClick}
    >
      {value}
    </button>
  );
};

const Board: React.FC = () => {
  const [squares, setSquares] = useState<SquareValue[]>(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState<boolean>(true);

  const handleClick = (i: number) => {
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    
    const newSquares = squares.slice();
    newSquares[i] = xIsNext ? 'X' : 'O';
    setSquares(newSquares);
    setXIsNext(!xIsNext);
  };

  const renderSquare = (i: number) => {
    return <Square value={squares[i]} onClick={() => handleClick(i)} />;
  };

  const winner = calculateWinner(squares);
  let status;
  if (winner) {
    status = `Winner: ${winner}`;
  } else if (squares.every(square => square !== null)) {
    status = 'Draw!';
  } else {
    status = `Next player: ${xIsNext ? 'X' : 'O'}`;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-xl font-bold mb-4">{status}</div>
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i}>{renderSquare(i)}</div>
        ))}
      </div>
    </div>
  );
};

// Helper function to determine winner
function calculateWinner(squares: SquareValue[]): SquareValue {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  
  return null;
}

export default Board; 