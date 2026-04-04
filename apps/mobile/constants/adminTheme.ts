// Premium dark admin design tokens — control center aesthetic
export const AdminTheme = {
  // Backgrounds
  bg: '#080B14',
  bgCard: '#0F1420',
  bgCardElevated: '#161D2E',
  bgSurface: '#131929',
  bgInput: '#0F1420',

  // Accent
  accent: '#3B82F6',       // blue — authority
  accentSoft: '#60A5FA',
  accentGlow: 'rgba(59,130,246,0.15)',
  green: '#10B981',
  greenSoft: 'rgba(16,185,129,0.15)',
  orange: '#F59E0B',
  orangeSoft: 'rgba(245,158,11,0.15)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.15)',
  purple: '#8B5CF6',
  purpleSoft: 'rgba(139,92,246,0.15)',
  teal: '#14B8A6',
  tealSoft: 'rgba(20,184,166,0.15)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  textInverse: '#080B14',

  // Borders
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',

  // Radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 18,
  radiusXl: 24,

  // Shadows
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowStrong: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
