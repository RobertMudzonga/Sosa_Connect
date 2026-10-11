import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Chip } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOrders, ACTIVE_STATUSES, Order } from '@/src/hooks/useOrders';
import { ORDER_STATUS_LABELS, getStatusColor } from '@/src/utils/orderStatus';
import { formatMoney, formatDateTime } from '@/src/utils/format';

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const { data: orders, isLoading, refetch, isRefetching } = useOrders({ as: 'buyer' }, { refetchInterval: 30000 });

  const filtered = (orders ?? []).filter((o) =>
    tab === 'active' ? ACTIVE_STATUSES.includes(o.status) : !ACTIVE_STATUSES.includes(o.status)
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const color = getStatusColor(item.status);
    const itemCount = item.items.reduce((sum, i) => sum + i.quantity, 0);
    return (
      <TouchableOpacity onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}>
        <Card variant="flat" style={styles.card}>
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="bold">{item.provider.businessName}</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>
              #{item.reference} · {formatDateTime(item.createdAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Typography>
            <View style={styles.cardFooter}>
              <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                <Typography variant="caption" weight="bold" style={{ color }}>{ORDER_STATUS_LABELS[item.status]}</Typography>
              </View>
              <Typography variant="bodySm" weight="bold">{formatMoney(item.total, item.currency)}</Typography>
            </View>
          </View>
          <ChevronRight size={20} color={activeTheme.textSecondary} />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.tabs}>
        <Chip label="Active" selected={tab === 'active'} onPress={() => setTab('active')} />
        <Chip label="Past" selected={tab === 'past'} onPress={() => setTab('past')} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={activeTheme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ShoppingBag size={40} color={activeTheme.textSecondary} />
            <Typography variant="body" color={activeTheme.textSecondary} style={{ marginTop: spacing.md }}>
              {isLoading ? 'Loading orders…' : tab === 'active' ? 'No orders in progress.' : 'No past orders yet.'}
            </Typography>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs },
  empty: { alignItems: 'center', marginTop: 80 },
});
