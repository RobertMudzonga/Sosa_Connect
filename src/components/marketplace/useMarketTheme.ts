import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme, palette, brand } from '../../theme/colors';

/**
 * Theme for marketplace screens. `accent` is the brand blue used for actionable text (links, "See all").
 */
export function useMarketTheme() {
  const scheme = useColorScheme() ?? 'light';
  const t = theme[scheme];
  return {
    ...t,
    scheme,
    accent: scheme === 'dark' ? palette.secondary[400] : brand.blue,
    /** Charcoal for active chips and strong UI that shouldn't use the brand blue */
    ink: '#0F172A',
    chipText: '#1E293B',
    deal: palette.danger,
    star: palette.warning,
  };
}
