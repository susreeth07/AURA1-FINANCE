import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppTheme } from '../types';

type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: AppTheme;          // stored preference: 'dark' | 'light' | 'system'
  resolved: ResolvedTheme;  // effective applied theme: 'dark' | 'light'
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;  // cycles: dark → light → system → dark
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemPreference = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

const resolveTheme = (pref: AppTheme): ResolvedTheme =>
  pref === 'system' ? getSystemPreference() : pref;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, _setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('aura-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'dark'; // Default to premium futuristic UI (dark)
  });

  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(
    (() => {
      const saved = localStorage.getItem('aura-theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
      return 'dark';
    })()
  ));

  // Apply the resolved theme to the DOM
  useEffect(() => {
    const r = resolveTheme(theme);
    setResolved(r);

    localStorage.setItem('aura-theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(r);
  }, [theme]);

  // Listen for OS theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const r = resolveTheme('system');
      setResolved(r);
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: AppTheme) => _setTheme(t), []);

  const toggleTheme = useCallback(() => {
    _setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark'; // system → dark
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
