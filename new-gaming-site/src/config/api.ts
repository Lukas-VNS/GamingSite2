// Get the API URL from environment variable or use default for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  signup: `${API_URL}/api/auth/signup`,
  login: `${API_URL}/api/auth/login`,
};

export default API_ENDPOINTS; 