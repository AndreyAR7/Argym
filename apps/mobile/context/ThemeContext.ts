import { createContext, useContext } from 'react';
import { getThemeConfig, type ThemeConfig } from '@/store/profile.store';

// Standalone context — no imports from app/ routes, no circular dependency.
export const AppThemeContext = createContext<ThemeConfig>(getThemeConfig('dark'));

export function useAppTheme(): ThemeConfig {
  return useContext(AppThemeContext);
}
