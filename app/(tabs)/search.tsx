import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SearchBar } from '@/src/components/features/SearchBar';
import { ProductCard, Product } from '@/src/components/common/ProductCard';
import { Typography } from '@/src/components/common/Typography';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CheckCircle2 } from 'lucide-react-native';
import { useServices } from '@/src/hooks/useServices';
import { toProduct } from '@/src/utils/product';
import { ProductSearch } from '@/src/components/marketplace/ProductSearch';
import { CurrencyToggle } from '@/src/components/marketplace/CurrencyToggle';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';

const CATEGORIES = ['All', 'Goods', 'Food', 'Services', 'Delivery'];

type SearchMode = 'products' | 'services';

export default function SearchScreen() {
  const t = useMarketTheme();
  const params = useLocalSearchParams<{ category?: string; mode?: SearchMode; department?: string }>();
  // Service-category deep links (?category=FOOD) open Services; everything else opens the product catalog
  const [mode, setMode] = useState<SearchMode>(params.category ? 'services' : 'products');

  useEffect(() => {
    if (params.mode) setMode(params.mode);
    else if (params.category) setMode('services');
  }, [params.mode, params.category]);

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={[styles.header, styles.headerRow]}>
        <View style={{ flex: 1 }}>
          <Typography variant="h2" weight="bold">Marketplace</Typography>
          <Typography variant="bodySm" color={t.textSecondary}>
            {mode === 'products' ? 'From local stores, delivered by nearby drivers' : 'Find what you need in your community'}
          </Typography>
        </View>
        {mode === 'products' && <CurrencyToggle />}
      </View>

      <View style={[styles.segment, { backgroundColor: t.surfaceVariant }]} accessibilityRole="tablist">
        {(['products', 'services'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.segmentBtn, mode === m && { backgroundColor: t.primary }]}
          >
            <Typography variant="bodySm" weight="semibold" style={{ color: mode === m ? '#fff' : t.textSecondary }}>
              {m === 'products' ? 'Products' : 'Food & Services'}
            </Typography>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'products' ? <ProductSearch initialCategory={params.department} /> : <ServicesSearch />}
    </View>
  );
}

function ServicesSearch() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Category tiles on the home screen deep-link here with ?category=FOOD etc.
  useEffect(() => {
    if (!params.category) return;
    const match = CATEGORIES.find(c => c.toUpperCase() === String(params.category).toUpperCase());
    if (match) setSelectedCategory(match);
  }, [params.category]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: services, isLoading } = useServices({ 
    category: selectedCategory === 'All' ? undefined : selectedCategory.toUpperCase(),
    search: debouncedSearch || undefined
  });

  const filteredProducts: Product[] = (services || [])
    .map(toProduct)
    .filter(p => !verifiedOnly || p.isVerified);

  return (
    <View style={{ flex: 1 }}>
      <SearchBar 
        value={search} 
        onChangeText={setSearch} 
        onFilterPress={() => setVerifiedOnly(!verifiedOnly)}
      />

      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip, 
                { backgroundColor: selectedCategory === cat ? '#0F172A' : activeTheme.surface, borderColor: selectedCategory === cat ? '#0F172A' : activeTheme.border, borderWidth: 1 }
              ]}
            >
              <Typography 
                variant="bodySm" 
                weight="semibold" 
                style={{ color: selectedCategory === cat ? '#fff' : activeTheme.textSecondary }}
              >
                {cat}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={styles.verifiedFilter} 
          onPress={() => setVerifiedOnly(!verifiedOnly)}
        >
          <View style={[
            styles.checkbox, 
            { borderColor: verifiedOnly ? activeTheme.primary : activeTheme.border, 
              backgroundColor: verifiedOnly ? activeTheme.primary : 'transparent' }
          ]}>
            {verifiedOnly && <CheckCircle2 size={12} color="#fff" />}
          </View>
          <Typography variant="bodySm" weight="medium">Verified Sellers Only</Typography>
        </TouchableOpacity>
        <Typography variant="caption" color={activeTheme.textSecondary}>
          {filteredProducts.length} results found
        </Typography>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.productWrapper}>
            <ProductCard product={item} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Typography variant="body" color={activeTheme.textSecondary}>
              {isLoading ? 'Loading…' : 'No results found for your search.'}
            </Typography>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 4,
    borderRadius: radius.md,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  verifiedFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  productWrapper: {
    marginBottom: spacing.md,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  }
});
