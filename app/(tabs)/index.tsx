import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { Header } from '@/src/components/layout/Header';
import { SearchBar } from '@/src/components/features/SearchBar';
import { EmergencyQuickAccess } from '@/src/components/features/EmergencyQuickAccess';
import { CategoryGrid } from '@/src/components/features/CategoryGrid';
import { InventoryManager } from '@/src/components/features/InventoryManager';
import { CommunityHub } from '@/src/components/features/CommunityHub';
import { ProductCard, Product } from '@/src/components/common/ProductCard';
import { Typography } from '@/src/components/common/Typography';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/src/store/app-store';
import { useServices } from '@/src/hooks/useServices';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { mode } = useAppStore();
  const { data: services, isLoading, refetch } = useServices();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const trending: Product[] = (services || []).map(s => ({
    id: s.id,
    title: s.title,
    price: s.price,
    currency: s.currency,
    location: s.provider?.city || 'Harare',
    rating: s.provider?.rating || 4.5,
    providerName: s.provider?.businessName || 'Verified Seller',
    category: s.category,
    imageUrl: s.imageUrl,
    isVerified: true,
  }));

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <Header />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeTheme.primary} />
        }
      >
        <SearchBar />
        
        {mode === 'buyer' ? (
          <>
            <EmergencyQuickAccess />
            <CategoryGrid />
            <CommunityHub />
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Typography variant="h3" weight="bold">Trending Near You</Typography>
                <Typography variant="bodySm" weight="semibold" color={activeTheme.primary}>Harare, ZW ›</Typography>
              </View>
              <View style={styles.productsList}>
                {trending.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.sellerSection}>
            <InventoryManager />
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  productsList: {
    gap: spacing.md,
  },
  sellerSection: {
    paddingTop: spacing.md,
  },
  sellerPlaceholder: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  placeholderText: {
    marginTop: spacing.md,
  }
});
