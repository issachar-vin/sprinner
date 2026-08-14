import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sprinner-theme';

const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isPreference(value: unknown): value is ThemePreference {
  return PREFERENCES.includes(value as ThemePreference);
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isPreference(stored) ? stored : 'system';
}

/**
 * Kept out of the board state: the theme is a per-device viewing preference,
 * not planning data, so it must not travel in an exported board file.
 *
 * "system" removes the attribute entirely rather than writing a resolved
 * value, so the CSS media query keeps tracking the OS if it changes later.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, preference);

    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }, [preference]);

  const choose = useCallback((next: ThemePreference) => setPreference(next), []);

  return { preference, choose, options: PREFERENCES };
}
