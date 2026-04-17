import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // For initial token check

  // On app mount, verify persisted token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token')) // Token invalid/expired
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (name, email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
