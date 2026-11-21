import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronRight, Package } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMarketOrders, MarketOrder } from '@/src/hooks/useMarket';
import { formatPrice, formatDateTime } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

const STATUS_LABEL: Record<MarketOrder['status'], string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  AWAITING_COD_OTP: 'Confirm with code',
  AWAITING_DEPOSIT: 'Pay delivery fee',
  CONFIRMED: 'In progress',
  COMPLETED: 'Complete',
  CANCELLED: 'Cancelled',
};

export default function MarketOrdersScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useMarketOrders();

  const statusColor = (s: MarketOrder['status']) =>
    s === 'CANCELLED' ? t.error : s === 'CONFIRMED' || s === 'COMPLETED' ? t.success : t.warning;

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: 'Shop orders' }} />
      <FlatList
        data={data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.accent} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/market/orders/[id]', params: { id: item.id } })}
            style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <View style={styles.flex}>
              <View style={styles.inline}>
                <Typography variant="bodySm" weight="bold">{item.reference}</Typography>
                <Typography variant="caption" weight="bold" color={statusColor(item.status)}>{STATUS_LABEL[item.status]}</Typography>
              </View>
              <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>
                {item.shipments.flatMap((s) => s.items.map((i) => i.title)).join(', ')}
              </Typography>
              <Typography variant="caption" color={t.textSecondary}>
                {formatDateTime(item.createdAt)} · {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'} · {item.shipments.length} {item.shipments.length === 1 ? 'parcel' : 'parcels'}
              </Typography>
            </View>
            <Typography variant="bodySm" weight="bold">{formatPrice(item.totals.total, item.paymentCurrency)}</Typography>
            <ChevronRight size={18} color={t.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={t.accent} /> : (
              <>
                <Package size={40} color={t.textSecondary} />
                <Typography variant="body" weight="semibold">No shop orders yet</Typography>
                <Button label="Start shopping" variant="outline" onPress={() => router.replace('/(tabs)/search')} />
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
  list: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 80 },
});
