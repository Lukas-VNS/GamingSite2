import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GameLandingPageProps {
  title: string;
  gameType: 'tictactoe' | 'connect4';
  gameDescription: string;
  localGamePath: string;
  multiplayerGamePath: string;
  renderGamePreview: () => React.ReactNode;
}

const GameLandingPage: React.FC<GameLandingPageProps> = ({
  title,
  gameType,
  gameDescription,
  localGamePath,
  multiplayerGamePath,
  renderGamePreview
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          {title}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Online Game Card */}
          <div 
            className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
            onClick={() => navigate(multiplayerGamePath)}
          >
            <h2 className="text-2xl font-bold mb-4">Online Multiplayer</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              {renderGamePreview()}
            </div>
            <p className="text-gray-300 mb-4">
              Challenge players online in real-time matches. Play against opponents from around the world!
            </p>
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors">
              Play Online
            </button>
          </div>

          {/* Local Game Card */}
          <div 
            className="bg-gray-700 rounded-lg p-6 shadow-xl hover:transform hover:scale-105 transition-all cursor-pointer"
            onClick={() => navigate(localGamePath)}
          >
            <h2 className="text-2xl font-bold mb-4">Local Game</h2>
            <div className="aspect-square bg-gray-600 rounded-lg p-4 mb-4">
              {renderGamePreview()}
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
            {gameDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameLandingPage; 