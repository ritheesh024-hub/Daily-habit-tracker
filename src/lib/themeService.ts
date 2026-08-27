import { ThemeMode } from '../types';

const THEME_PREFIX = 'dh_cache_theme_';
const GLOBAL_THEME_KEY = 'dh_theme_pref';

/**
 * Returns whether the system/device prefers dark mode.
 */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolves the effective appearance ('light' or 'dark') based on the current mode and system settings.
 */
export function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return getSystemPrefersDark() ? 'dark' : 'light';
}

/**
 * Reads the cached theme choice for the specified user (or global preference if no user).
 * Defaults to 'system'.
 */
export function getCachedTheme(userId?: string): ThemeMode {
  try {
    if (userId) {
      const userTheme = localStorage.getItem(`${THEME_PREFIX}${userId}`);
      if (userTheme === 'light' || userTheme === 'dark' || userTheme === 'system') {
        return userTheme;
      }
    }
    const globalTheme = localStorage.getItem(GLOBAL_THEME_KEY);
    if (globalTheme === 'light' || globalTheme === 'dark' || globalTheme === 'system') {
      return globalTheme;
    }
  } catch (e) {
    console.warn('Error reading cached theme:', e);
  }
  return 'system';
}

/**
 * Persists the theme choice in localStorage with user isolation and global fallback.
 */
export function setCachedTheme(mode: ThemeMode, userId?: string): void {
  try {
    localStorage.setItem(GLOBAL_THEME_KEY, mode);
    if (userId) {
      localStorage.setItem(`${THEME_PREFIX}${userId}`, mode);
    }
  } catch (e) {
    console.warn('Error saving cached theme:', e);
  }
}

/**
 * Applies the given theme mode to document.documentElement and updates the meta theme-color.
 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const effective = getEffectiveTheme(mode);
  const root = document.documentElement;

  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color for mobile browser chrome
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effective === 'dark' ? '#09090b' : '#ffffff');
  }
}

/**
 * Listens for system dark mode changes and triggers a callback if mode is 'system'.
 */
export function listenToSystemThemeChange(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    callback();
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  } else if ('addListener' in mediaQuery) {
    // Fallback for older browsers
    (mediaQuery as any).addListener(listener);
    return () => (mediaQuery as any).removeListener(listener);
  }

  return () => {};
}
