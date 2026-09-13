import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import authService from '../services/authService';
import { setAccessToken, clearAccessToken } from '../services/tokenManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('adaptiq_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [initializing, setInitializing] = useState(true);

  // Restore in-memory access token silently on initial load if refresh token exists
  useEffect(() => {
    const bootstrapToken = async () => {
      const refreshToken = localStorage.getItem('adaptiq_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          setAccessToken(data.data.accessToken);
        } catch {
          // Refresh token expired or revoked
          clearAccessToken();
          localStorage.removeItem('adaptiq_user');
          localStorage.removeItem('adaptiq_refresh_token');
          setUser(null);
        }
      } else {
        clearAccessToken();
      }
      setInitializing(false);
    };

    bootstrapToken();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setAccessToken(data.accessToken);
    localStorage.setItem('adaptiq_user', JSON.stringify(data.user));
    localStorage.setItem('adaptiq_refresh_token', data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await authService.register(name, email, password);
    setAccessToken(data.accessToken);
    localStorage.setItem('adaptiq_user', JSON.stringify(data.user));
    localStorage.setItem('adaptiq_refresh_token', data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    clearAccessToken();
    localStorage.removeItem('adaptiq_user');
    localStorage.removeItem('adaptiq_refresh_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
