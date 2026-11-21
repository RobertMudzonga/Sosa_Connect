import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/layout/Header';
import { SearchBar } from '@/src/components/features/SearchBar';
import { EmergencyQuickAccess } from '@/src/components/features/EmergencyQuickAccess';
import { CategoryGrid } from '@/src/components/features/CategoryGrid';
import { InventoryManager } from '@/src/components/features/InventoryManager';
import { CommunityHub } from '@/src/components/features/CommunityHub';
import { ProductCard, Product } from '@/src/components/common/ProductCard';
import { Typography } from '@/src/components/common/Typography';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { spacing, radius } from '@/src/theme/spacing';
import { useAppStore } from '@/src/store/app-store';
import { useServices } from '@/src/hooks/useServices';
import { toProduct } from '@/src/utils/product';
import { ShopSection } from '@/src/components/marketplace/ShopSection';

/** Home: shopping first (search, departments, product rails, categories); emergency help as a compact strip */
export default function HomeScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { mode, setMode } = useAppStore();
  const { data: services, refetch } = useServices();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const trending: Product[] = (services || []).map(toProduct);
  const openSearch = () => router.push({ pathname: '/(tabs)/search', params: { mode: 'products' } });

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: t.surface }]}>
      <Header />
      <ScrollView
        style={{ backgroundColor: t.background }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textSecondary} />}
      >
        <View style={styles.top} />
        {mode === 'buyer' ? (
          <>
            <SearchBar onPress={openSearch} />
            <ShopSection />
            <CategoryGrid />
            <EmergencyQuickAccess />
            <CommunityHub />
            {trending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Typography variant="h3" weight="bold">Services near you</Typography>
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { mode: 'services' } })}>
                    <Typography variant="bodySm" weight="semibold" color={t.accent}>See all</Typography>
                  </TouchableOpacity>
                </View>
                <View style={styles.productsList}>
                  {trending.map((item) => <ProductCard key={item.id} product={item} />)}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.sellerSection}>
            <View style={[styles.sellerNote, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Typography variant="bodySm" color={t.textSecondary} style={styles.flex}>You’re in seller mode.</Typography>
              <TouchableOpacity onPress={() => setMode('buyer')}>
                <Typography variant="bodySm" weight="semibold" color={t.accent}>Back to shopping</Typography>
              </TouchableOpacity>
            </View>
            <InventoryManager />
          </View>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  top: { height: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  productsList: { gap: spacing.md },
  sellerSection: { paddingTop: spacing.xs },
  sellerNote: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  bottomSpace: { height: 100 },
});
