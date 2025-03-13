import React from 'react';
import { useNavigate } from 'react-router-dom';

const TicTacToePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Tic Tac Toe
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Online Game Card */}
          <div className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
               onClick={() => navigate('/tictactoe/multiplayer')}>
            <h2 className="text-2xl font-bold mb-4">Online Multiplayer</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-2 h-full">
                <div className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold text-blue-400">X</div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center"></div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold text-red-400">O</div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center"></div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold text-blue-400">X</div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center"></div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold text-red-400">O</div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center"></div>
                <div className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold text-blue-400">X</div>
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              Challenge players online in real-time matches. Compete against others and climb the rankings!
            </p>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors">
              Play Online
            </button>
          </div>

          {/* Local Game Card */}
          <div className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
               onClick={() => navigate('/tictactoe/local')}>
            <h2 className="text-2xl font-bold mb-4">Local Game</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-2 h-full">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-700 rounded-md flex items-center justify-center text-2xl font-bold"
                  >
                    {i % 3 === 0 ? 'X' : i % 3 === 1 ? 'O' : ''}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              Play against a friend on the same device. Take turns making moves and see who wins!
            </p>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
              Play Local Game
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold mb-4">How to Play</h3>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Get three in a row horizontally, vertically, or diagonally to win! Take turns placing your mark (X or O) 
            on the board. Play locally with friends or challenge players online for an exciting match.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicTacToePage; 