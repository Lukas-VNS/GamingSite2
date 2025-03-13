import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import GameRoom from './pages/GameRoom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TicTacToePage from './pages/TicTacToePage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route path="/tictactoe" element={
            <ProtectedRoute>
              <TicTacToePage />
            </ProtectedRoute>
          } />
          <Route path="/tictactoe/local" element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          } />
          <Route path="/tictactoe/multiplayer" element={
            <ProtectedRoute>
              <MultiplayerGamePage />
            </ProtectedRoute>
          } />
          <Route path="/tictactoe/multiplayer/game/:gameId" element={
            <ProtectedRoute>
              <GameRoom />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
