import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Pressable, Switch } from 'react-native';
import { X } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import type { CatalogSearchParams, SearchFacets, SortOption } from '../../hooks/useCatalog';
import { useMarketStore } from '../../store/market-store';
import { currencyLabel, formatPrice } from '../../utils/format';
import { radius, spacing } from '../../theme/spacing';
import { useMarketTheme } from './useMarketTheme';

export type ProductFilters = Pick<CatalogSearchParams, 'category' | 'brand' | 'minPrice' | 'maxPrice' | 'currency' | 'city' | 'fulfilment' | 'inStock' | 'sort'>;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Best match' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

/** How many filters (besides sort) are active, for the filter button badge */
export function activeFilterCount(f: ProductFilters): number {
  return [
    f.category,
    f.brand?.length,
    f.minPrice !== undefined || f.maxPrice !== undefined,
    f.city,
    f.fulfilment,
    f.inStock,
  ].filter(Boolean).length;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: ProductFilters;
  facets?: SearchFacets;
  resultCount?: number;
  onApply: (filters: ProductFilters) => void;
}

const parsePrice = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s.trim() && Number.isFinite(n) ? n : undefined;
};

export const FilterSheet: React.FC<Props> = ({ visible, onClose, filters, facets, resultCount, onApply }) => {
  const t = useMarketTheme();
  const currency = useMarketStore((s) => s.currency);
  const [draft, setDraft] = useState<ProductFilters>(filters);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');

  // Start each opening from the applied filters
  useEffect(() => {
    if (!visible) return;
    setDraft(filters);
    // Price inputs are typed in the display currency; drop bounds typed in the other one
    const sameCurrency = (filters.currency ?? 'USD') === currency;
    setMinText(sameCurrency && filters.minPrice !== undefined ? String(filters.minPrice) : '');
    setMaxText(sameCurrency && filters.maxPrice !== undefined ? String(filters.maxPrice) : '');
  }, [visible, filters, currency]);

  const set = (patch: Partial<ProductFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleBrand = (slug: string) =>
    set({ brand: draft.brand?.includes(slug) ? draft.brand.filter((b) => b !== slug) : [...(draft.brand ?? []), slug] });

  const apply = () => {
    const minPrice = parsePrice(minText);
    const maxPrice = parsePrice(maxText);
    onApply({ ...draft, minPrice, maxPrice, currency });
    onClose();
  };

  const reset = () => {
    setDraft({ sort: draft.sort });
    setMinText('');
    setMaxText('');
  };

  const Chip = ({ label, active, onPress, count }: { label: string; active: boolean; onPress: () => void; count?: number }) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? t.ink : t.surface, borderColor: active ? t.ink : t.border }]}
    >
      <Typography variant="bodySm" weight="semibold" style={{ color: active ? '#fff' : t.text }}>
        {label}
        {count !== undefined && <Typography variant="caption" style={{ color: active ? '#CBD5E1' : t.textSecondary }}>{`  ${count}`}</Typography>}
      </Typography>
    </TouchableOpacity>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Typography variant="body" weight="bold" style={styles.sectionTitle}>{title}</Typography>
      <View style={styles.chips}>{children}</View>
    </View>
  );

  const priceHint = facets?.price.min && facets.price.max
    ? `${formatPrice(facets.price.min, currency)} – ${formatPrice(facets.price.max, currency)}`
    : undefined;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.surface }]}>
        <View style={styles.header}>
          <Typography variant="h3" weight="bold">Filter & sort</Typography>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close filters">
            <X size={22} color={t.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Section title="Sort by">
            {SORT_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={(draft.sort ?? 'relevance') === o.value} onPress={() => set({ sort: o.value })} />
            ))}
          </Section>

          {!!facets?.categories.length && (
            <Section title="Department">
              {facets.categories.map((c) => (
                <Chip key={c.id} label={c.name} count={c.count} active={draft.category === c.slug} onPress={() => set({ category: draft.category === c.slug ? undefined : c.slug })} />
              ))}
            </Section>
          )}

          <View style={styles.section}>
            <Typography variant="body" weight="bold" style={styles.sectionTitle}>Price ({currencyLabel(currency)})</Typography>
            {priceHint && <Typography variant="caption" color={t.textSecondary} style={{ marginBottom: 8 }}>Range in results: {priceHint}</Typography>}
            <View style={styles.priceRow}>
              <TextInput
                value={minText}
                onChangeText={setMinText}
                placeholder="Min"
                keyboardType="decimal-pad"
                placeholderTextColor={t.textSecondary}
                style={[styles.priceInput, { backgroundColor: t.surfaceVariant, color: t.text }]}
                accessibilityLabel="Minimum price"
              />
              <Typography color={t.textSecondary}>to</Typography>
              <TextInput
                value={maxText}
                onChangeText={setMaxText}
                placeholder="Max"
                keyboardType="decimal-pad"
                placeholderTextColor={t.textSecondary}
                style={[styles.priceInput, { backgroundColor: t.surfaceVariant, color: t.text }]}
                accessibilityLabel="Maximum price"
              />
            </View>
          </View>

          {!!facets?.brands.length && (
            <Section title="Brand">
              {facets.brands.map((b) => (
                <Chip key={b.id} label={b.name} count={b.count} active={!!draft.brand?.includes(b.slug)} onPress={() => toggleBrand(b.slug)} />
              ))}
            </Section>
          )}

          {!!facets?.cities.length && (
            <Section title="Stores in">
              {facets.cities.map((c) => (
                <Chip key={c.id} label={c.name} count={c.count} active={draft.city === c.slug} onPress={() => set({ city: draft.city === c.slug ? undefined : c.slug })} />
              ))}
            </Section>
          )}

          {!!facets?.fulfilment.length && (
            <Section title="Delivery">
              {facets.fulfilment.map((f) => (
                <Chip key={f.value} label={f.label} count={f.count} active={draft.fulfilment === f.value} onPress={() => set({ fulfilment: draft.fulfilment === f.value ? undefined : f.value })} />
              ))}
            </Section>
          )}

          <View style={[styles.switchRow, { borderColor: t.border }]}>
            <Typography variant="body" weight="semibold">In stock only</Typography>
            <Switch value={!!draft.inStock} onValueChange={(v) => set({ inStock: v || undefined })} />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderColor: t.border }]}>
          <Button label="Reset" variant="outline" onPress={reset} style={styles.flex} />
          <Button label={resultCount !== undefined ? `Show results` : 'Apply'} onPress={apply} style={styles.flex2} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  section: { marginTop: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  priceInput: { flex: 1, minWidth: 0, width: 0, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
