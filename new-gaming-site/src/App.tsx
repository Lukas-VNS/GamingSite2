import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tictactoe" element={<GamePage />} />
          <Route path="/tictactoe/multiplayer" element={<MultiplayerGamePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
