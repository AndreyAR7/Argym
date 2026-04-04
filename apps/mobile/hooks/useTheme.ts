/**
 * useTheme — returns the currently active ThemeConfig, reactive to changes.
 *
 * Drop-in replacement for static theme imports:
 *   BEFORE: import { ClientTheme as T } from '@/constants/clientTheme';
 *   AFTER:  const T = useTheme();
 *
 * ThemeConfig has all fields from both ClientTheme and AdminTheme,
 * so no other code changes are needed in the component body.
 */
import { useContext } from 'react';
import { AppThemeContext } from '@/app/_layout';
import type { ThemeConfig } from '@/store/profile.store';

export function useTheme(): ThemeConfig {
  return useContext(AppThemeContext);
}
