/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { IUser, ThemeMode, INotification } from '../types.js';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  theme: ThemeMode;
  notifications: INotification[];
  loading: boolean;
  login: (token: string, user: IUser) => void;
  logout: () => void;
  updateUser: (user: IUser) => void;
  toggleTheme: () => void;
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth and theme on load
  useEffect(() => {
    const storedToken = localStorage.getItem('speakwise_token');
    const storedUser = localStorage.getItem('speakwise_user');
    const storedTheme = localStorage.getItem('speakwise_theme') as ThemeMode;

    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme('light');
    }

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Fetch notifications if logged in
  useEffect(() => {
    if (token) {
      fetchNotifications();
      // Poll notifications every 20 seconds
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const applyTheme = (mode: ThemeMode) => {
    const root = window.document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('speakwise_theme', newTheme);
    applyTheme(newTheme);
  };

  const login = (newToken: string, newUser: IUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('speakwise_token', newToken);
    localStorage.setItem('speakwise_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('speakwise_token');
    localStorage.removeItem('speakwise_user');
  };

  const updateUser = (updatedUser: IUser) => {
    setUser(updatedUser);
    localStorage.setItem('speakwise_user', JSON.stringify(updatedUser));
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const list = await res.json();
        setNotifications(list);
      } else if (res.status === 401 || res.status === 403) {
        console.warn('Notification fetch unauthorized, logging out stale session');
        logout();
      } else {
        console.warn('Failed to fetch notifications with status:', res.status);
      }
    } catch (err) {
      console.warn('Error fetching notifications (network/server offline):', err);
    }
  };

  const markNotificationsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } else {
        console.warn('Failed to mark notifications read with status:', res.status);
      }
    } catch (err) {
      console.warn('Error reading alerts (network/server offline):', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      theme,
      notifications,
      loading,
      login,
      logout,
      updateUser,
      toggleTheme,
      fetchNotifications,
      markNotificationsRead
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
