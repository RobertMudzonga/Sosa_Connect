import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Vibration, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Phone } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { Chip } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOrders, useUpdateOrderStatus, Order, OrderStatus } from '@/src/hooks/useOrders';
import { formatAddress } from '@/src/hooks/useAddresses';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, getStatusColor } from '@/src/utils/orderStatus';
import { formatMoney, formatDateTime, getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';

type Tab = 'new' | 'active' | 'done';

const TAB_STATUSES: Record<Tab, OrderStatus[]> = {
  new: ['PLACED'],
  active: ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'],
  done: ['DELIVERED', 'COLLECTED', 'CANCELLED', 'REJECTED', 'REFUNDED'],
};

/** The next step a seller can take for an order, if any */
const getNextAction = (order: Order): { label: string; status: OrderStatus } | null => {
  switch (order.status) {
    case 'ACCEPTED': return { label: 'Start preparing', status: 'PREPARING' };
    case 'PREPARING': return { label: 'Mark ready', status: 'READY' };
    case 'READY':
      return order.fulfilment === 'COLLECTION'
        ? { label: 'Mark collected', status: 'COLLECTED' }
        // No platform driver assigned yet: the seller can send it with their own rider
        : order.driver ? null : { label: 'Send with own rider', status: 'OUT_FOR_DELIVERY' };
    case 'OUT_FOR_DELIVERY':
      return order.driver ? null : { label: 'Mark delivered', status: 'DELIVERED' };
    default: return null;
  }
};

export default function SellerOrdersScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [tab, setTab] = useState<Tab>('new');
  const { data: orders, isLoading, refetch, isRefetching } = useOrders({ as: 'seller' }, { refetchInterval: 15000 });
  const updateStatus = useUpdateOrderStatus();

  const newCount = (orders ?? []).filter((o) => o.status === 'PLACED').length;

  // Buzz when a new order arrives while this screen is open
  const previousNewCount = useRef<number | null>(null);
  useEffect(() => {
    if (!orders) return;
    if (previousNewCount.current !== null && newCount > previousNewCount.current) {
      Vibration.vibrate([0, 400, 200, 400]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    previousNewCount.current = newCount;
  }, [orders, newCount]);

  const setStatus = async (order: Order, status: OrderStatus, reason?: string) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status, reason });
    } catch (error) {
      notify('Could not update order', getErrorMessage(error));
    }
  };

  const handleReject = async (order: Order) => {
    const confirmed = await confirmAction('Decline order?', 'The customer will be notified and refunded.', 'Decline', true);
    if (confirmed) setStatus(order, 'REJECTED', 'Declined by seller');
  };

  const filtered = (orders ?? []).filter((o) => TAB_STATUSES[tab].includes(o.status));

  const renderOrder = ({ item: order }: { item: Order }) => {
    const color = getStatusColor(order.status);
    const next = getNextAction(order);
    return (
      <Card variant="elevated" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="bold">#{order.reference} · {order.fulfilment === 'DELIVERY' ? 'Delivery' : 'Collection'}</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>
              {formatDateTime(order.createdAt)}{order.scheduledFor ? ` · for ${formatDateTime(order.scheduledFor)}` : ' · ASAP'}
            </Typography>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Typography variant="caption" weight="bold" style={{ color }}>{ORDER_STATUS_LABELS[order.status]}</Typography>
          </View>
        </View>

        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Typography variant="bodySm" weight="bold">{item.quantity}×</Typography>
            <View style={{ flex: 1 }}>
              <Typography variant="bodySm">{item.title}</Typography>
              {item.options.length > 0 && (
                <Typography variant="caption" color={activeTheme.textSecondary}>{item.options.map((o) => o.name).join(', ')}</Typography>
              )}
              {!!item.notes && <Typography variant="caption" color={activeTheme.warning}>“{item.notes}”</Typography>}
            </View>
          </View>
        ))}
        {!!order.notes && (
          <Typography variant="caption" color={activeTheme.warning} style={{ marginTop: 4 }}>Note: {order.notes}</Typography>
        )}

        <View style={[styles.meta, { borderColor: activeTheme.border }]}>
          <Typography variant="caption" color={activeTheme.textSecondary}>
            {order.buyer?.fullName ?? 'Customer'}
            {order.fulfilment === 'DELIVERY' && order.address ? ` · ${formatAddress(order.address)}` : ''}
          </Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>
            {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.paymentStatus.toLowerCase()} · {formatMoney(order.subtotal, order.currency)}
          </Typography>
          {order.driver && <Typography variant="caption" color={activeTheme.textSecondary}>Driver: {order.driver.fullName}</Typography>}
        </View>

        <View style={styles.actions}>
          {!!order.buyer?.phone && (
            <Button
              label="Call"
              variant="ghost"
              size="sm"
              icon={<Phone size={14} color={activeTheme.primary} />}
              onPress={() => Linking.openURL(`tel:${order.buyer!.phone}`)}
            />
          )}
          {order.status === 'PLACED' && (
            <>
              <Button label="Decline" variant="outline" size="sm" style={styles.actionBtn} onPress={() => handleReject(order)} />
              <Button label="Accept" variant="primary" size="sm" style={styles.actionBtn} onPress={() => setStatus(order, 'ACCEPTED')} />
            </>
          )}
          {next && (
            <Button label={next.label} variant="primary" size="sm" style={styles.actionBtn} onPress={() => setStatus(order, next.status)} />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.tabs}>
        <Chip label={`New${newCount ? ` (${newCount})` : ''}`} selected={tab === 'new'} onPress={() => setTab('new')} />
        <Chip label="In progress" selected={tab === 'active'} onPress={() => setTab('active')} />
        <Chip label="Completed" selected={tab === 'done'} onPress={() => setTab('done')} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={activeTheme.primary} />}
        ListEmptyComponent={
          <Typography align="center" color={activeTheme.textSecondary} style={{ marginTop: 60 }}>
            {isLoading ? 'Loading…' : tab === 'new' ? 'No new orders. New orders appear here automatically.' : 'Nothing here yet.'}
          </Typography>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs },
  itemRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  meta: { borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm, gap: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flexShrink: 1 },
});
