/**
 * Kuwana — Find What Matters
 * Premium Design System with Navy & Slate palette.
 */

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
    primary: palette.primary[600],
    background: palette.neutral[50],
    surface: '#ffffff',
    surfaceVariant: palette.neutral[100],
    text: palette.neutral[950],
    textSecondary: palette.neutral[500],
    border: palette.neutral[200],
    error: palette.danger,
    success: palette.success,
    warning: palette.warning,
  },
};
