import { createContext, useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { readStoredJson } from '../utils/readStoredJson';

const AuthContext = createContext(null);

const roleViews = {
  admin: ['dashboard', 'customers', 'staff', 'inventory', 'pos', 'appointments', 'services', 'settings'],
  staff: ['dashboard', 'pos', 'customers', 'appointments'],
  customer: ['dashboard', 'customers'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredJson('gym_user', null));
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('gym_token');
    if (!t || t === 'undefined' || t === 'null') return null;
    return t;
  });
  const [authError, setAuthError] = useState('');

  const storeSession = (payload) => {
    if (payload.user != null) {
      localStorage.setItem('gym_user', JSON.stringify(payload.user));
    } else {
      localStorage.removeItem('gym_user');
    }
    if (payload.token != null && payload.token !== '') {
      localStorage.setItem('gym_token', payload.token);
    } else {
      localStorage.removeItem('gym_token');
    }
    setUser(payload.user ?? null);
    setToken(payload.token ?? null);
  };

  const login = async (credentials) => {
    setAuthError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      if (!data || typeof data !== 'object' || !data.token || data.user == null) {
        const msg =
          'Login response was invalid. If you use VITE_API_URL, include https:// (e.g. https://your-api.railway.app).';
        setAuthError(msg);
        throw new Error(msg);
      }
      storeSession(data);
      return data.user;
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Unable to login.');
      throw err;
    }
  };

  const signup = async (payload) => {
    setAuthError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/signup`, payload);
      if (!data || typeof data !== 'object' || !data.token || data.user == null) {
        const msg =
          'Sign-up response was invalid. If you use VITE_API_URL, include https:// (e.g. https://your-api.railway.app).';
        setAuthError(msg);
        throw new Error(msg);
      }
      storeSession(data);
      return data.user;
    } catch (err) {
      setAuthError(err.response?.data?.error || err.message || 'Unable to sign up.');
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

