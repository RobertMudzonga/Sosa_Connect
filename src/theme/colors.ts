/**
 * Kuwana — Find What Matters
 * Light, minimal marketplace palette: off-white canvas, white cards with hairline slate borders,
 * charcoal text and a single brand blue kept for primary actions, active states and the currency pill.
 */

/** The one brand accent. Use sparingly: primary buttons, active tabs/chips, links that act. */
export const brand = {
  blue: '#0B66C3',
  blueDark: '#08509A',
  blueSoft: '#E8F1FB',
};

/** Soft elevation for cards (the "shadow-xs" level) */
export const shadowXs = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
} as const;

export const palette = {
  // Brand Colors (Kuwana Navy)
  primary: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#0E3F7C', // Kuwana Navy
    600: '#0D386E',
    700: '#0B2E5C',
    800: '#09254B',
    900: '#071A35',
    950: '#040F1F',
  },
  
  // Secondary (Teal accent)
  secondary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },

  // Accents & Alerts
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Neutral / Surfaces (Optimized for Dark Mode)
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617', // Absolute Deep
  },
};

export const theme = {
  dark: {
    primary: palette.primary[500],
    background: palette.neutral[950],
    surface: palette.neutral[900],
    surfaceVariant: palette.neutral[800],
    text: palette.neutral[50],
    textSecondary: palette.neutral[400],
    border: palette.neutral[800],
    error: palette.danger,
    success: palette.success,
    warning: palette.warning,
  },
  light: {
    primary: brand.blue,
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
  },
};
