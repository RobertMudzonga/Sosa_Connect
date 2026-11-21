/**
 * The app is light-only: a bright, minimal marketplace look on every screen and platform.
 * Kept as a hook so screens don't change if a dark theme comes back later.
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
