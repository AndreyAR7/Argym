// Premium dark-first design tokens for the client app
export const ClientTheme = {
  // Backgrounds
  bg: '#0A0A0F',
  bgCard: '#13131A',
  bgCardElevated: '#1C1C26',
  bgSurface: '#1A1A24',

  // Accent colors
  accent: '#6C63FF',       // primary purple
  accentSoft: '#8B85FF',
  accentGlow: 'rgba(108,99,255,0.18)',
  green: '#00D68F',
  greenSoft: 'rgba(0,214,143,0.15)',
  orange: '#FF8C42',
  orangeSoft: 'rgba(255,140,66,0.15)',
  red: '#FF4D6D',
  redSoft: 'rgba(255,77,109,0.15)',
  blue: '#4DA6FF',
  blueSoft: 'rgba(77,166,255,0.15)',
  gold: '#FFD166',
  goldSoft: 'rgba(255,209,102,0.15)',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9090B0',
  textMuted: '#5A5A7A',
  textInverse: '#0A0A0F',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  // Gradients (as arrays for LinearGradient)
  gradientAccent: ['#6C63FF', '#9B59B6'] as string[],
  gradientGreen: ['#00D68F', '#00B4D8'] as string[],
  gradientOrange: ['#FF8C42', '#FF4D6D'] as string[],
  gradientCard: ['#1C1C26', '#13131A'] as string[],
  gradientDark: ['rgba(10,10,15,0)', 'rgba(10,10,15,0.95)'] as string[],

  // Spacing
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 20,
  radiusXl: 28,

  // Shadows
  shadowCard: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  shadowStrong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

export type ClientThemeType = typeof ClientTheme;
