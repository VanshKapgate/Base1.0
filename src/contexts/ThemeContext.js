import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const lightTheme = {
  dark: false,
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  primary: '#6C63FF',
  primaryDark: '#4B44CC',
  accent: '#FF6B6B',
  text: '#1A1A2E',
  subText: '#666680',
  border: '#E0E0E0',
  inputBg: '#F0F0F8',
  bubble: {
    sent: '#6C63FF',
    received: '#FFFFFF',
    sentText: '#FFFFFF',
    receivedText: '#1A1A2E',
  },
  online: '#4CAF50',
  offline: '#9E9E9E',
  danger: '#FF4444',
  adminBadge: '#FFD700',
  apostleBadge: '#C0C0C0',
};

export const darkTheme = {
  dark: true,
  background: '#0D0D1A',
  surface: '#1A1A2E',
  card: '#16213E',
  primary: '#7C73FF',
  primaryDark: '#6C63FF',
  accent: '#FF6B6B',
  text: '#E8E8F0',
  subText: '#9090A0',
  border: '#2A2A3E',
  inputBg: '#1E1E32',
  bubble: {
    sent: '#6C63FF',
    received: '#1E1E32',
    sentText: '#FFFFFF',
    receivedText: '#E8E8F0',
  },
  online: '#4CAF50',
  offline: '#555570',
  danger: '#FF4444',
  adminBadge: '#FFD700',
  apostleBadge: '#C0C0C0',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true); // default dark

  useEffect(() => {
    AsyncStorage.getItem('theme').then((val) => {
      if (val !== null) setIsDark(val === 'dark');
    });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
