import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../common/Typography';
import { useMarketStore } from '../../store/market-store';
import { formatPrice } from '../../utils/format';
import type { Money } from '../../hooks/useCatalog';
import { useMarketTheme } from './useMarketTheme';

interface PriceProps {
  price: Money | null;
  /** "Was" price, shown struck through when higher */
  listPrice?: Money | null;
  size?: 'sm' | 'md' | 'lg';
  /** Show the other currency underneath, e.g. "≈ ZiG 5,055.75" */
  showAlternate?: boolean;
}

/** A price in the buyer's chosen display currency (USD or ZiG) */
export const Price: React.FC<PriceProps> = ({ price, listPrice, size = 'md', showAlternate = false }) => {
  const t = useMarketTheme();
  const currency = useMarketStore((s) => s.currency);
  if (!price) return null;

  const variant = size === 'lg' ? 'h2' : size === 'md' ? 'h3' : 'body';
  const alternate = currency === 'USD' ? 'ZWG' : 'USD';
  const showDeal = !!listPrice && listPrice.usd > price.usd;
  const savePct = showDeal ? Math.round((1 - price.usd / listPrice!.usd) * 100) : 0;

  return (
    <View>
      <View style={styles.row}>
        <Typography variant={variant} weight="bold" style={size === 'sm' ? styles.small : undefined}>
          {formatPrice(price, currency)}
        </Typography>
        {showDeal && (
          <Typography variant="caption" color={t.textSecondary} style={styles.strike}>
            {formatPrice(listPrice, currency)}
          </Typography>
        )}
        {showDeal && size !== 'sm' && (
          <View style={[styles.badge, { backgroundColor: t.deal }]}>
            <Typography variant="caption" weight="bold" style={{ color: '#fff' }}>-{savePct}%</Typography>
          </View>
        )}
      </View>
      {showAlternate && (alternate === 'USD' || price.zwg !== null) && (
        <Typography variant="caption" color={t.textSecondary}>≈ {formatPrice(price, alternate)}</Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  small: { fontSize: 15, lineHeight: 20 },
  strike: { textDecorationLine: 'line-through' },
  badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'center' },
});
