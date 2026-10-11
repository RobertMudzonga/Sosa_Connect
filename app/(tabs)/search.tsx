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

const CATEGORIES = ['All', 'Goods', 'Food', 'Services', 'Delivery'];

export default function SearchScreen() {
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
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold">Marketplace</Typography>
        <Typography variant="bodySm" color={activeTheme.textSecondary}>Find what you need in your community</Typography>
      </View>

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
                { backgroundColor: selectedCategory === cat ? activeTheme.primary : activeTheme.surfaceVariant }
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
