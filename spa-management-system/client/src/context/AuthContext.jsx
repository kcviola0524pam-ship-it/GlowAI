import { createContext, useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

const roleViews = {
  admin: ['dashboard', 'customers', 'staff', 'inventory', 'pos', 'appointments', 'services', 'settings'],
  staff: ['dashboard', 'pos', 'customers', 'appointments'],
  customer: ['dashboard', 'customers'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('gym_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gym_token'));
  const [authError, setAuthError] = useState('');

  const storeSession = (payload) => {
    localStorage.setItem('gym_user', JSON.stringify(payload.user));
    localStorage.setItem('gym_token', payload.token);
    setUser(payload.user);
    setToken(payload.token);
  };

  const login = async (credentials) => {
    setAuthError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      storeSession(data);
      return data.user;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Unable to login.');
      throw err;
    }
  };

  const signup = async (payload) => {
    setAuthError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/signup`, payload);
      storeSession(data);
      return data.user;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Unable to sign up.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('gym_user');
    localStorage.removeItem('gym_token');
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      authError,
      login,
      signup,
      logout,
      permissions: roleViews[user?.role] || ['dashboard'],
    }),
    [user, token, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

