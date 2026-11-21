import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../common/Typography';
import { CityPicker } from '../marketplace/CityPicker';
import { CurrencyToggle } from '../marketplace/CurrencyToggle';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { spacing, radius } from '../../theme/spacing';

/**
 * Compact sticky top bar for the home screen: logo, delivery location and the USD / ZiG switch
 * (with the day's rate as micro-copy). Buyer / seller mode lives in Profile.
 */
export const Header: React.FC = () => {
  const t = useMarketTheme();
  return (
    <View style={[styles.bar, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: t.ink }]}>
            <Typography variant="body" weight="bold" style={styles.logoText}>K</Typography>
          </View>
          <Typography variant="body" weight="bold" style={styles.wordmark}>KUWANA</Typography>
        </View>
        <CurrencyToggle showRate />
      </View>
      <CityPicker />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 30, height: 30, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#FFFFFF' },
  wordmark: { letterSpacing: 1.5 },
});
