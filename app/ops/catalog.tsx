import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { SearchBar } from '@/src/components/features/SearchBar';
import { Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAdminProducts, AdminProductRow } from '@/src/hooks/useOps';
import { radius, spacing } from '@/src/theme/spacing';

type StatusTab = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
const STATUS_TONE: Record<AdminProductRow['status'], 'good' | 'warn' | 'bad'> = { ACTIVE: 'good', DRAFT: 'warn', ARCHIVED: 'bad' };

export default function CatalogAdmin() {
  const t = useMarketTheme();
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<StatusTab>('ACTIVE');
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const { data, isLoading, refetch, isRefetching } = useAdminProducts(q, tab);

  const openEditor = (id?: string) => router.push({ pathname: '/ops/product', params: id ? { id } : {} });

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{
        headerRight: () => (
          <TouchableOpacity onPress={() => openEditor()} accessibilityLabel="New product" style={styles.headerBtn}>
            <Plus size={22} color={t.accent} />
          </TouchableOpacity>
        ),
      }} />
      <View style={styles.top}>
        <View style={styles.search}><SearchBar value={text} onChangeText={setText} placeholder="Search by title or SKU" /></View>
        <Tabs value={tab} onChange={setTab} options={[{ value: 'ACTIVE', label: 'Live' }, { value: 'DRAFT', label: 'Drafts' }, { value: 'ARCHIVED', label: 'Archived' }]} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openEditor(item.id)} style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
              {item.image ? <Image source={{ uri: item.image }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
            </View>
            <View style={styles.flex}>
              <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{item.title}</Typography>
              <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>
                {item.sku}{item.brand ? ` · ${item.brand}` : ''} · {item.category}
              </Typography>
              <Typography variant="caption" color={t.textSecondary}>
                {item.offerCount ? `${item.offerCount} store${item.offerCount === 1 ? '' : 's'}` : 'No stores'}
                {item.buyBoxPriceUsd !== null ? ` · Buy Box ${usd(item.buyBoxPriceUsd)}` : item.status === 'ACTIVE' ? ' · not in stock' : ''}
              </Typography>
            </View>
            <Pill label={item.status === 'ACTIVE' ? 'Live' : item.status === 'DRAFT' ? 'Draft' : 'Archived'} tone={STATUS_TONE[item.status]} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={t.accent} /> : (
              <>
                <Typography variant="bodySm" color={t.textSecondary} align="center">
                  {q ? 'No products match.' : tab === 'DRAFT' ? 'No drafts.' : tab === 'ARCHIVED' ? 'Nothing archived.' : 'No live products yet.'}
                </Typography>
                <Button label="New product" onPress={() => openEditor()} />
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  headerBtn: { paddingHorizontal: spacing.sm },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  search: { marginHorizontal: -spacing.lg, marginBottom: -spacing.md },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 80, paddingHorizontal: spacing.lg },
});
