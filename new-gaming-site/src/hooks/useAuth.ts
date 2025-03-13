import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState({ user: null, loading: false });
        return;
      }

      try {
        const response = await fetch(`${API_ENDPOINTS.user}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAuthState({ user: data.user, loading: false });
        } else {
          localStorage.removeItem('token');
          setAuthState({ user: null, loading: false });
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setAuthState({ user: null, loading: false });
      }
    };

    checkAuth();
  }, []);

  return authState;
};

export default useAuth; 