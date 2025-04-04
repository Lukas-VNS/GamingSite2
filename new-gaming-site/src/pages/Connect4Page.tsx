import React from 'react';
import { useNavigate } from 'react-router-dom';

const Connect4Page: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Connect 4
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Online Game Card */}
          <div className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
               onClick={() => navigate('/connect4/multiplayer')}>
            <h2 className="text-2xl font-bold mb-4">Online Multiplayer</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-7 gap-1 h-full">
                {[...Array(42)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    {i % 2 === 0 ? 'X' : ''}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              Challenge players online in real-time matches. Drop your pieces and connect four to win!
            </p>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors">
              Play Online
            </button>
          </div>

          {/* Local Game Card */}
          <div className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
               onClick={() => navigate('/connect4/local')}>
            <h2 className="text-2xl font-bold mb-4">Local Game</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-7 gap-1 h-full">
                {[...Array(42)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    {i % 2 === 0 ? 'X' : i % 2 === 1 ? 'O' : ''}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              Play against a friend on the same device. Take turns dropping pieces and see who connects four first!
            </p>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
              Play Local Game
            </button>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold mb-4">How to Play</h3>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Drop your pieces into any column and try to connect four of your pieces horizontally, vertically, or diagonally. 
            The first player to connect four pieces wins! Play locally with friends or challenge players online for an exciting match.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Connect4Page; 