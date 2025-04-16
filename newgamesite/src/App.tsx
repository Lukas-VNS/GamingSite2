import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameSocketProvider } from './context/GameSocketContext';
import Layout from './Layout';
import HomePage from './HomePage';
import LoginPage from './Auth/LoginPage';
import SignupPage from './Auth/SignupPage';
import ProtectedRoute from './Auth/ProtectedRoute';
import TicTacToeLandingPage from './Games/TicTacToe/TicTacToeLandingPage';
import TicTacToeLocalGame from './Games/TicTacToe/TicTacToeLocalGame';
import TicTacToeMultiplayerQueue from './Games/TicTacToe/TicTacToeMultiplayerQueue';
import TicTacToeMultiplayerGameRoom from './Games/TicTacToe/TicTacToeMultiplayerGameRoom';
import Connect4LandingPage from './Games/Connect4/Connect4LandingPage';
import Connect4LocalPage from './Games/Connect4/Connect4LocalPage';
import Connect4MultiplayerPageQueue from './Games/Connect4/Connect4MultiplayerPageQueue';
import Connect4MultiplayerGameRoom from './Games/Connect4/Connect4MultiplayerGameRoom';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes - Non-Multiplayer */}
          <Route path="/tictactoe" element={
            <ProtectedRoute>
              <TicTacToeLandingPage />
            </ProtectedRoute>
          } />
          <Route path="/tictactoe/local" element={
            <ProtectedRoute>
              <TicTacToeLocalGame />
            </ProtectedRoute>
          } />
          <Route path="/connect4" element={
            <ProtectedRoute>
              <Connect4LandingPage />
            </ProtectedRoute>
          } />
          <Route path="/connect4/local" element={
            <ProtectedRoute>
              <Connect4LocalPage />
            </ProtectedRoute>
          } />

          {/* Protected Routes - Multiplayer (Wrapped with GameSocketProvider) */}
          <Route path="/tictactoe/multiplayerqueue" element={
            <ProtectedRoute>
              <GameSocketProvider>
                <TicTacToeMultiplayerQueue />
              </GameSocketProvider>
            </ProtectedRoute>
          } />
          <Route path="/tictactoe/multiplayer/game/:gameId" element={
            <ProtectedRoute>
              <GameSocketProvider>
                <TicTacToeMultiplayerGameRoom />
              </GameSocketProvider>
            </ProtectedRoute>
          } />
          <Route path="/connect4/multiplayerqueue" element={
            <ProtectedRoute>
              <GameSocketProvider>
                <Connect4MultiplayerPageQueue />
              </GameSocketProvider>
            </ProtectedRoute>
          } />
          <Route path="/connect4/multiplayer/game/:gameId" element={
            <ProtectedRoute>
              <GameSocketProvider>
                <Connect4MultiplayerGameRoom />
              </GameSocketProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;