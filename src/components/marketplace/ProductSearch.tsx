import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { SearchBar } from '../features/SearchBar';
import { useCatalogSearch, useCategoryTree } from '../../hooks/useCatalog';
import { useBuyerLocation } from '../../store/market-store';
import { radius, spacing } from '../../theme/spacing';
import { CatalogProductCard } from './CatalogProductCard';
import { FilterSheet, ProductFilters, activeFilterCount, SORT_OPTIONS } from './FilterSheet';
import { useMarketTheme } from './useMarketTheme';
import { CityPicker } from './CityPicker';

interface Props {
  /** Department slug to start in (deep link from the home screen) */
  initialCategory?: string;
}

/** Catalog search: text, department chips, filter sheet, two-column results with infinite scroll */
export const ProductSearch: React.FC<Props> = ({ initialCategory }) => {
  const t = useMarketTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({ category: initialCategory, sort: 'relevance' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: departments } = useCategoryTree();

  useEffect(() => {
    if (initialCategory) setFilters((f) => ({ ...f, category: initialCategory }));
  }, [initialCategory]);

  // Debounce typing so slow connections aren't flooded with requests
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);

  // The buyer's delivery location narrows results to what a store can deliver there,
  // unless a "Stores in" town filter is picked in the sheet
  const location = useBuyerLocation();
  const params = useMemo(
    () => ({ q, ...(filters.city ? {} : location), ...filters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, filters, location.city, location.suburb, location.lat, location.lng],
  );
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage, isError, refetch } = useCatalogSearch(params);

  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total;
  const facets = data?.pages[0]?.facets;
  const filterCount = activeFilterCount(filters);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === (filters.sort ?? 'relevance'))?.label;

  const topLevel = departments?.filter((d) => d.productCount > 0) ?? [];
  const selectedDept = filters.category;

  return (
    <View style={styles.flex}>
      <SearchBar
        value={text}
        onChangeText={setText}
        placeholder="Search phones, solar, groceries…"
        onFilterPress={() => setSheetOpen(true)}
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            style={[styles.chip, styles.filterChip, { backgroundColor: filterCount ? t.ink : t.surface, borderColor: filterCount ? t.ink : t.border }]}
            accessibilityLabel={`Filters${filterCount ? `, ${filterCount} active` : ''}`}
          >
            <SlidersHorizontal size={14} color={filterCount ? '#fff' : t.text} />
            <Typography variant="bodySm" weight="semibold" style={{ color: filterCount ? '#fff' : t.text }}>
              {filterCount ? `Filters (${filterCount})` : 'Filters'}
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilters((f) => ({ ...f, category: undefined }))}
            style={[styles.chip, { backgroundColor: !selectedDept ? t.ink : t.surface, borderColor: !selectedDept ? t.ink : t.border }]}
          >
            <Typography variant="bodySm" weight="semibold" style={{ color: !selectedDept ? '#fff' : t.chipText }}>All</Typography>
          </TouchableOpacity>
          {topLevel.map((d) => {
            const active = selectedDept === d.slug || d.children.some((c) => c.slug === selectedDept);
            return (
              <TouchableOpacity
                key={d.id}
                onPress={() => setFilters((f) => ({ ...f, category: active ? undefined : d.slug }))}
                style={[styles.chip, { backgroundColor: active ? t.ink : t.surface, borderColor: active ? t.ink : t.border }]}
              >
                <Typography variant="bodySm" weight="semibold" style={{ color: active ? '#fff' : t.chipText }}>{d.name}</Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.locationRow}>
        <CityPicker />
      </View>

      <View style={styles.summary}>
        <Typography variant="caption" color={t.textSecondary}>
          {total === undefined ? ' ' : `${total} ${total === 1 ? 'product' : 'products'}`}
          {sortLabel && filters.sort !== 'relevance' ? ` · ${sortLabel}` : ''}
        </Typography>
        {filterCount > 0 && (
          <TouchableOpacity onPress={() => setFilters({ sort: filters.sort })} style={styles.clear} accessibilityLabel="Clear filters">
            <X size={12} color={t.accent} />
            <Typography variant="caption" weight="semibold" color={t.accent}>Clear filters</Typography>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        style={{ opacity: isFetching && !isFetchingNextPage && !isLoading ? 0.6 : 1 }}
        renderItem={({ item }) => (
          // flex: 1/2 keeps a lone last card at half width
          <View style={styles.cell}>
            <CatalogProductCard product={item} />
          </View>
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={t.accent} /> : <View style={styles.footer} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? (
              <ActivityIndicator color={t.accent} />
            ) : isError ? (
              <TouchableOpacity onPress={() => refetch()}>
                <Typography variant="body" color={t.textSecondary} align="center">{"Couldn't load products. Tap to retry."}</Typography>
              </TouchableOpacity>
            ) : (
              <>
                <Typography variant="body" weight="semibold" align="center">No products found</Typography>
                <Typography variant="bodySm" color={t.textSecondary} align="center">Try a different word or remove some filters.</Typography>
              </>
            )}
          </View>
        }
      />

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        facets={facets}
        resultCount={total}
        onApply={setFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  locationRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  flex: { flex: 1 },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  list: { paddingHorizontal: spacing.lg - 4, paddingBottom: 40 },
  column: { gap: 0 },
  cell: { flex: 1 / 2, padding: 4 },
  footer: { height: 60, marginTop: spacing.md },
  empty: { marginTop: 80, alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg },
});
