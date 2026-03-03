import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * useTheme — manages dark/light theme with system preference detection
 */
export function useTheme() {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const [theme, setThemeStorage] = useLocalStorage(
    'voidtv-theme',
    prefersDark ? 'dark' : 'light'
  );

  // Apply theme to <html> element
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    // Update PWA theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        theme === 'dark' ? '#050e05' : '#f0fdf4'
      );
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const stored = localStorage.getItem('voidtv-theme');
      if (!stored) {
        setThemeStorage(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setThemeStorage]);

  const toggleTheme = useCallback(() => {
    setThemeStorage((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setThemeStorage]);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
