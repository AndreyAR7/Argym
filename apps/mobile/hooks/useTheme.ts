import { useContext } from 'react';
import { AppThemeContext } from '@/context/ThemeContext';
import type { ThemeConfig } from '@/store/profile.store';

export function useTheme(): ThemeConfig {
  return useContext(AppThemeContext);
}
