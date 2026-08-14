import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to following the system', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('sets the attribute for an explicit choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.choose('dark'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => result.current.choose('light'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes the attribute when returning to system', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.choose('dark'));
    act(() => result.current.choose('system'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists the choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.choose('dark'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores a persisted choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('falls back to system when storage holds junk', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('does not store the theme in the board state', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.choose('dark'));
    expect(localStorage.getItem('sprinner-board')).toBeNull();
  });
});
