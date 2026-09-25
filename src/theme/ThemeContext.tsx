import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorsLight, ColorPalette } from './colors.light';
import { colorsDark } from './colors.dark';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'eventrix:theme';

interface ThemeContextValue {
  theme: ThemeMode;
  colors: ColorPalette;
  // True once persisted preference has been read/applied — mirrors the web version's
  // localStorage-then-OS-preference fallback: until this resolves, `theme` is a guess.
  isReady: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');
  const [isReady, setIsReady] = useState(false);

  // Persisted choice wins; falls back to the OS preference (matching
  // theme-provider.tsx's localStorage-then-prefers-color-scheme logic) when nothing's been
  // saved yet — e.g. first launch, or after the app's storage was cleared.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setThemeState(saved);
        } else if (systemScheme === 'dark') {
          setThemeState('dark');
        }
      })
      .finally(() => setIsReady(true));
    // Intentionally only on mount — once the user (or this effect) sets a theme, later OS
    // preference changes shouldn't silently override an explicit choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    void AsyncStorage.setItem(STORAGE_KEY, mode);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors: theme === 'dark' ? colorsDark : colorsLight, isReady, setTheme, toggleTheme }),
    [theme, isReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
