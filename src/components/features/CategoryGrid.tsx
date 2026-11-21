import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag, Utensils, Wrench, Truck } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import { spacing, radius } from '../../theme/spacing';

const CATEGORIES = [
  { id: 'GOODS', title: 'Goods', icon: ShoppingBag },
  { id: 'FOOD', title: 'Food', icon: Utensils },
  { id: 'SERVICES', title: 'Services', icon: Wrench },
  { id: 'DELIVERY', title: 'Delivery', icon: Truck },
];

/** Soft-gray rounded tiles with a centred icon and the label underneath */
export const CategoryGrid: React.FC = () => {
  const t = useMarketTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Typography variant="h3" weight="bold" style={styles.title}>Browse categories</Typography>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.item}
            onPress={() => router.push({ pathname: '/search', params: { category: cat.id } } as never)}
            accessibilityRole="button"
            accessibilityLabel={cat.title}
          >
            <View style={[styles.tile, { backgroundColor: t.surfaceVariant }]}>
              <cat.icon color={t.ink} size={26} strokeWidth={1.75} />
            </View>
            <Typography variant="bodySm" weight="semibold" align="center">{cat.title}</Typography>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  title: { marginBottom: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.md },
  item: { flex: 1, gap: spacing.xs },
  tile: { aspectRatio: 1, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
});
