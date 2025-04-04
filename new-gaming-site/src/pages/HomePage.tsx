import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Play Games Online with Friends
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Join our growing community of players and experience exciting multiplayer games. 
            Sign up for free and start playing today!
          </p>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/signup')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
            >
              Sign Up Free
            </button>
          )}
        </div>
      </div>

      {/* Available Games Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Available Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Tic Tac Toe Card */}
          <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Tic Tac Toe</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-600 rounded-md flex items-center justify-center text-2xl font-bold"
                  >
                    {i % 2 === 0 ? 'X' : ''}
                  </div>
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                Challenge your friends to the classic game of Tic Tac Toe. Play locally or online!
              </p>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/tictactoe')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
                >
                  Play Now
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
                >
                  Sign In to Play
                </button>
              )}
            </div>
          </div>

          {/* Connect 4 Card */}
          <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">Connect 4</h3>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {[...Array(42)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-600 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    {i % 2 === 0 ? 'X' : ''}
                  </div>
                ))}
              </div>
              <p className="text-gray-300 mb-4">
                Drop your pieces and connect four in a row to win! Challenge friends in this strategic game.
              </p>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/connect4')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
                >
                  Play Now
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
                >
                  Sign In to Play
                </button>
              )}
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-gray-700 rounded-lg overflow-hidden shadow-lg">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">More Games Coming Soon!</h3>
              <div className="aspect-video bg-gray-600 rounded-md flex items-center justify-center mb-4">
                <svg
                  className="w-20 h-20 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-300">
                We're working on adding more exciting multiplayer games. Stay tuned for updates!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Real-Time Multiplayer</h3>
            <p className="text-gray-300">
              Play in real-time with players from around the world
            </p>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Free to Play</h3>
            <p className="text-gray-300">
              All games are free to play with your friends
            </p>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Growing Collection</h3>
            <p className="text-gray-300">
              New games added regularly to keep the fun going
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 