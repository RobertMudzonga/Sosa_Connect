import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../common/Typography';
import { useCatalogSearch, useCategoryTree, CatalogSearchParams } from '../../hooks/useCatalog';
import { useBuyerLocation } from '../../store/market-store';
import { radius, spacing } from '../../theme/spacing';
import { CatalogProductCard } from './CatalogProductCard';
import { useMarketTheme } from './useMarketTheme';

const CARD_WIDTH = 168;

function ProductRail({ title, params, seeAll }: { title: string; params: CatalogSearchParams; seeAll?: string }) {
  const t = useMarketTheme();
  const router = useRouter();
  const location = useBuyerLocation();
  const { data, isLoading } = useCatalogSearch({ ...location, ...params }, { limit: 10 });
  const items = data?.pages[0]?.data ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Typography variant="body" weight="bold">{title}</Typography>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { mode: 'products', ...(seeAll ? { department: seeAll } : {}) } })}>
          <Typography variant="bodySm" weight="semibold" color={t.accent}>See all ›</Typography>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator color={t.accent} style={styles.loading} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {items.map((p) => (
            <CatalogProductCard key={p.id} product={p} width={CARD_WIDTH} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Home-screen entry to the product catalog: departments and a couple of product rails */
export const ShopSection: React.FC = () => {
  const t = useMarketTheme();
  const router = useRouter();
  const { data: departments } = useCategoryTree();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Typography variant="h3" weight="bold">Shop</Typography>
          <Typography variant="caption" color={t.textSecondary}>From local stores, delivered to your door</Typography>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.departments}>
        {(departments ?? []).filter((d) => d.productCount > 0).map((d) => (
          <TouchableOpacity
            key={d.id}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { mode: 'products', department: d.slug } })}
            style={[styles.department, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <Typography variant="bodySm" weight="semibold" color={t.chipText}>{d.name}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ProductRail title="Popular right now" params={{ sort: 'rating', inStock: true }} />
      <ProductRail title="Beat load-shedding" params={{ category: 'solar-power', inStock: true }} seeAll="solar-power" />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.md },
  departments: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  department: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  rail: { marginTop: spacing.md },
  railHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  railContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  loading: { height: 120 },
});
