// Get the API URL from environment variable or use default for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const API_ENDPOINTS = {
  signup: `${API_BASE_URL}/api/auth/signup`,
  login: `${API_BASE_URL}/api/auth/login`,
  user: `${API_BASE_URL}/api/auth/user`,
  userCount: `${API_BASE_URL}/api/auth/count`,
  games: {
    current: `${API_BASE_URL}/api/games/current`,
    join: `${API_BASE_URL}/api/games/join`,
    get: (gameId: number) => `${API_BASE_URL}/api/games/${gameId}`,
    move: (gameId: number) => `${API_BASE_URL}/api/games/${gameId}/move`
  }
};

export default API_ENDPOINTS; 