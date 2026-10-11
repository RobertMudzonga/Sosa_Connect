import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { TextField, Chip } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdminOrders, useRefundOrder } from '@/src/hooks/useAdmin';
import { useUpdateOrderStatus, Order, OrderStatus } from '@/src/hooks/useOrders';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, getStatusColor } from '@/src/utils/orderStatus';
import { formatMoney, formatDateTime, getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';

const FILTERS: (OrderStatus | undefined)[] = [undefined, 'PLACED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const CLOSED: OrderStatus[] = ['DELIVERED', 'COLLECTED', 'CANCELLED', 'REJECTED', 'REFUNDED'];

export default function AdminOrdersScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const [filter, setFilter] = useState<OrderStatus | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const { data: orders, isLoading, refetch, isRefetching } = useAdminOrders(filter);
  const refundOrder = useRefundOrder();
  const updateStatus = useUpdateOrderStatus();

  const handleRefund = async (order: Order) => {
    const amount = refundAmount.trim() ? Number(refundAmount) : undefined;
    if (amount !== undefined && (Number.isNaN(amount) || amount <= 0 || amount > order.total)) {
      notify('Invalid amount', `Enter an amount up to ${formatMoney(order.total, order.currency)}, or leave blank for a full refund.`);
      return;
    }
    if (!refundReason.trim()) {
      notify('Reason required', 'Record why this refund is being issued.');
      return;
    }
    const confirmed = await confirmAction(
      'Issue refund?',
      `Refund ${formatMoney(amount ?? order.total, order.currency)} to the customer for #${order.reference}?`,
      'Refund',
      true,
    );
    if (!confirmed) return;
    try {
      await refundOrder.mutateAsync({ id: order.id, amount, reason: refundReason.trim() });
      setRefundReason('');
      setRefundAmount('');
      notify('Refund issued');
    } catch (error) {
      notify('Refund failed', getErrorMessage(error));
    }
  };

  const handleCancel = async (order: Order) => {
    const confirmed = await confirmAction('Cancel order?', `Cancel #${order.reference} on behalf of the platform? The customer will be refunded.`, 'Cancel order', true);
    if (!confirmed) return;
    try {
      await updateStatus.mutateAsync({ id: order.id, status: 'CANCELLED', reason: 'Cancelled by Kuwana support' });
    } catch (error) {
      notify('Could not cancel', getErrorMessage(error));
    }
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const color = getStatusColor(order.status);
    const expanded = expandedId === order.id;
    return (
      <Card variant="elevated" style={styles.card}>
        <TouchableOpacity onPress={() => setExpandedId(expanded ? null : order.id)}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Typography variant="body" weight="bold">#{order.reference} · {order.provider.businessName}</Typography>
              <Typography variant="caption" color={activeTheme.textSecondary}>
                {order.buyer?.fullName ?? 'Customer'} · {formatDateTime(order.createdAt)}
              </Typography>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Typography variant="bodySm" weight="bold">{formatMoney(order.total, order.currency)}</Typography>
              <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                <Typography variant="caption" weight="bold" style={{ color }}>{ORDER_STATUS_LABELS[order.status]}</Typography>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={[styles.details, { borderColor: activeTheme.border }]}>
            {order.items.map((i) => (
              <Typography key={i.id} variant="caption">{i.quantity}× {i.title} — {formatMoney(i.unitPrice * i.quantity, order.currency)}</Typography>
            ))}
            <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: spacing.xs }}>
              {PAYMENT_METHOD_LABELS[order.paymentMethod]} · payment {order.paymentStatus.toLowerCase()} · {order.fulfilment.toLowerCase()}
            </Typography>
            {!!order.cancelReason && <Typography variant="caption" color={activeTheme.textSecondary}>Reason: {order.cancelReason}</Typography>}

            {!CLOSED.includes(order.status) && (
              <Button label="Cancel order" variant="outline" size="sm" onPress={() => handleCancel(order)} style={{ marginTop: spacing.sm }} />
            )}
            {order.paymentStatus === 'PAID' && (
              <View style={{ marginTop: spacing.md }}>
                <Typography variant="bodySm" weight="bold" style={{ marginBottom: spacing.xs }}>Refund</Typography>
                <TextField placeholder={`Amount (blank = full ${formatMoney(order.total, order.currency)})`} keyboardType="decimal-pad" value={refundAmount} onChangeText={setRefundAmount} />
                <TextField placeholder="Reason (e.g. missing item, dispute outcome)" value={refundReason} onChangeText={setRefundReason} />
                <Button label="Issue refund" variant="danger" size="sm" loading={refundOrder.isPending} onPress={() => handleRefund(order)} />
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f ?? 'ALL'} label={f ? ORDER_STATUS_LABELS[f] : 'All'} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={orders ?? []}
        keyExtractor={(o) => o.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={activeTheme.primary} />}
        ListEmptyComponent={
          <Typography align="center" color={activeTheme.textSecondary} style={{ marginTop: 60 }}>
            {isLoading ? 'Loading…' : 'No orders found.'}
          </Typography>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { padding: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs, marginTop: 4 },
  details: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md, gap: 2 },
});
