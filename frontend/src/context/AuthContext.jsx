import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('gharpay_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('gharpay_token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Failed to restore user session:', err);
          localStorage.removeItem('gharpay_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (res.token && res.user) {
      localStorage.setItem('gharpay_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res.user;
  };

  const register = async (data) => {
    const res = await api.auth.register(data);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('gharpay_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      setUser(res.user);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
