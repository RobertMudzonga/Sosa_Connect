import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Pill, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { REQUEST_STATUS } from '@/src/components/catalog/requestStatus';
import { useProductRequests, AdminProductRequest } from '@/src/hooks/useOps';
import { formatDateTime } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

type Tab = 'PENDING' | 'APPROVED' | 'DUPLICATE' | 'REJECTED';

/** Sellers' requests for products that aren't in the catalog yet */
export default function ProductRequestsQueue() {
  const t = useMarketTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('PENDING');
  const { data, isLoading, refetch, isRefetching } = useProductRequests(tab);
  const pending = data?.counts.PENDING ?? 0;

  const renderItem = ({ item: r }: { item: AdminProductRequest }) => (
    <TouchableOpacity onPress={() => router.push({ pathname: '/ops/request', params: { id: r.id } })} style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
        {r.images[0] ? <Image source={{ uri: r.images[0].url }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
      </View>
      <View style={styles.flex}>
        <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{r.title}</Typography>
        <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>
          {r.seller.businessName} · {formatDateTime(r.createdAt)}
        </Typography>
        <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>
          {[r.brandName, r.category?.name, r.barcode ? `barcode ${r.barcode}` : null].filter(Boolean).join(' · ') || 'No brand or category given'}
        </Typography>
      </View>
      {tab !== 'PENDING' && <Pill label={REQUEST_STATUS[r.status].label} tone={REQUEST_STATUS[r.status].tone} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <View style={styles.top}>
        <Tabs value={tab} onChange={setTab} options={[
          { value: 'PENDING', label: pending ? `To review (${pending})` : 'To review' },
          { value: 'APPROVED', label: 'Added' },
          { value: 'DUPLICATE', label: 'Linked' },
          { value: 'REJECTED', label: 'Declined' },
        ]} />
      </View>
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? <ActivityIndicator color={t.accent} style={styles.empty} /> : (
            <Typography variant="bodySm" color={t.textSecondary} align="center" style={styles.empty}>
              {tab === 'PENDING' ? 'Nothing to review. Sellers’ requests for new products appear here.' : 'Nothing here yet.'}
            </Typography>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  empty: { marginTop: 80, paddingHorizontal: spacing.lg },
});
