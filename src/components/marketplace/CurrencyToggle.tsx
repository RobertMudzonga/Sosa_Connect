import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../common/Typography';
import { useMarketStore, DisplayCurrency } from '../../store/market-store';
import { useExchangeRate } from '../../hooks/useCatalog';
import { radius } from '../../theme/spacing';
import { useMarketTheme } from './useMarketTheme';

const OPTIONS: { value: DisplayCurrency; label: string }[] = [
  { value: 'USD', label: 'USD' },
  { value: 'ZWG', label: 'ZiG' },
];

/** USD / ZiG switch. ZiG is disabled until an exchange rate exists. */
export const CurrencyToggle: React.FC<{ showRate?: boolean }> = ({ showRate = false }) => {
  const t = useMarketTheme();
  const { currency, setCurrency } = useMarketStore();
  const { data: rate } = useExchangeRate();
  const zigAvailable = !!rate;

  return (
    <View style={styles.wrap}>
      <View style={[styles.toggle, { backgroundColor: t.surfaceVariant, borderColor: t.border }]} accessibilityRole="radiogroup" accessibilityLabel="Display currency">
        {OPTIONS.map((o) => {
          const active = currency === o.value || (o.value === 'USD' && !zigAvailable);
          const disabled = o.value === 'ZWG' && !zigAvailable;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => setCurrency(o.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled }}
              style={[styles.option, active && { backgroundColor: t.primary }, disabled && { opacity: 0.4 }]}
            >
              <Typography variant="caption" weight="bold" style={{ color: active ? '#fff' : t.textSecondary }}>
                {o.label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>
      {showRate && rate && (
        <Typography variant="caption" color={t.textSecondary} style={styles.rate}>
          $1 = ZiG {rate.rate.toFixed(2)}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end', gap: 2 },
  toggle: { flexDirection: 'row', padding: 2, borderRadius: radius.full, gap: 2, borderWidth: 1 },
  option: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  rate: { fontSize: 11 },
});
