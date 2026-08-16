import { create } from 'zustand';
import { ThemeId, applyTheme } from '../../theme';

interface ThemeState {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme: ThemeId = (() => {
    try {
      const saved = localStorage.getItem('editorial_theme') as ThemeId;
      return saved || 'apple-blue';
    } catch {
      return 'apple-blue';
    }
  })();

  // Apply immediately on load
  if (typeof document !== 'undefined') {
    applyTheme(initialTheme);
  }

  return {
    currentTheme: initialTheme,
    setTheme: (theme: ThemeId) => {
      try {
        localStorage.setItem('editorial_theme', theme);
      } catch (e) {
        console.error('Failed to save theme to localStorage:', e);
      }
      applyTheme(theme);
      set({ currentTheme: theme });
    },
  };
});
