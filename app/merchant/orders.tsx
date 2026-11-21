import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Clock, MapPin, Store, Bike, Car, Truck, KeyRound, RotateCcw } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Pill, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useStoreMe, useStoreOrders, useStoreOrderAction, StoreOrder, StoreTab } from '@/src/hooks/useStore';
import { getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const TAB_LABELS: Record<StoreTab, string> = { new: 'New', preparing: 'Preparing', ready: 'Ready', history: 'History' };
const VEHICLE_ICON = { BIKE: Bike, CAR: Car, BAKKIE: Truck } as const;

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** "12 min left", "3 min late" */
function minutesFrom(iso: string, now: number) {
  const mins = Math.round((new Date(iso).getTime() - now) / 60_000);
  return mins >= 0 ? `${mins} min left` : `${-mins} min late`;
}

function jobLine(o: StoreOrder) {
  const job = o.deliveryJob;
  if (!job) return null;
  switch (job.status) {
    case 'OPEN': return 'Waiting for a driver to accept';
    case 'CLAIMED': return job.driver ? `${job.driver.name} is coming${job.driver.vehicleReg ? ` · ${job.driver.vehicleReg}` : ''}` : 'A driver is coming';
    case 'IN_TRANSIT': return 'Collected by the driver';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
    default: return null;
  }
}

function OrderCard({ o, showBranch, now }: { o: StoreOrder; showBranch: boolean; now: number }) {
  const t = useMarketTheme();
  const act = useStoreOrderAction();
  const VehicleIcon = VEHICLE_ICON[o.vehicleClass ?? 'BIKE'];

  const run = async (action: 'accept' | 'ready' | 'out-of-stock' | 'received-back') => {
    if (action === 'out-of-stock') {
      const ok = await confirmAction(
        'Can’t fill this order?',
        'We’ll offer it to another store, or refund the buyer. It counts against your on-time score.',
        'Mark out of stock',
        true,
      );
      if (!ok) return;
    }
    try {
      const res = await act.mutateAsync({ id: o.id, action });
      if (action === 'out-of-stock' || action === 'received-back') notify(action === 'out-of-stock' ? 'Order passed on' : 'Back in stock', res.message);
    } catch (e) {
      notify('Could not update the order', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: o.overdue ? t.error : t.border }]}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Typography variant="body" weight="bold">{o.reference}</Typography>
          {showBranch && o.branch && <Typography variant="caption" color={t.textSecondary}>{o.branch.name} · {o.branch.code}</Typography>}
        </View>
        {o.stage === 'NEW' && o.acceptBy && <Pill label={`Accept · ${minutesFrom(o.acceptBy, now)}`} tone={o.overdue ? 'bad' : 'warn'} />}
        {o.stage === 'PREPARING' && o.readyBy && <Pill label={`Ready by ${hhmm(o.readyBy)}`} tone={o.overdue ? 'bad' : 'info'} />}
        {o.stage === 'READY' && <Pill label="Ready for pickup" tone="good" />}
        {o.stage === 'RETURNING' && <Pill label="Coming back" tone="warn" />}
        {['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(o.stage) && (
          <Pill label={o.stage === 'OUT_FOR_DELIVERY' ? 'With the driver' : o.stage === 'DELIVERED' ? 'Delivered' : 'Cancelled'} tone={o.stage === 'CANCELLED' ? 'bad' : 'good'} />
        )}
      </View>
      {o.reassigned && (
        <View style={styles.inline}>
          <RotateCcw size={12} color={t.textSecondary} />
          <Typography variant="caption" color={t.textSecondary}>Passed on from another store</Typography>
        </View>
      )}

      <View style={styles.items}>
        {o.items.map((i) => (
          <View key={i.id} style={styles.rowBetween}>
            <Typography variant="bodySm" style={styles.flex}>
              <Typography variant="bodySm" weight="bold">{i.quantity} × </Typography>{i.title}
            </Typography>
            <Typography variant="caption" color={t.textSecondary}>{i.sellerSku ?? i.sku}</Typography>
          </View>
        ))}
      </View>

      <View style={styles.inline}>
        {o.order.deliveryMode === 'PICKUP' ? <Store size={13} color={t.textSecondary} /> : <MapPin size={13} color={t.textSecondary} />}
        <Typography variant="caption" color={t.textSecondary} style={styles.flex}>
          {o.order.deliveryMode === 'PICKUP' ? `Driver takes it to ${o.order.pickupPointName}` : `Driver delivers to ${o.order.recipientFirstName}, ${o.order.area}`}
          {o.distanceKm !== null ? ` · ${o.distanceKm} km` : ''}
        </Typography>
        <VehicleIcon size={14} color={t.textSecondary} />
      </View>
      {!!o.order.notes && <Typography variant="caption" color={t.textSecondary}>Note: {o.order.notes}</Typography>}
      <Typography variant="caption" weight="semibold" color={t.success}>You earn {usd(o.earningsUsd)}</Typography>

      {o.stage === 'READY' && o.deliveryJob && (
        <View style={[styles.pinBox, { backgroundColor: t.surfaceVariant }]}>
          {o.deliveryJob.pickupPin && (
            <>
              <View style={styles.inline}>
                <KeyRound size={14} color={t.textSecondary} />
                <Typography variant="caption" color={t.textSecondary}>Check the driver’s ID, then give them this PIN</Typography>
              </View>
              <Typography variant="h1" weight="bold" style={styles.pin} accessibilityLabel={`Pickup PIN ${o.deliveryJob.pickupPin.split('').join(' ')}`}>
                {o.deliveryJob.pickupPin}
              </Typography>
            </>
          )}
          {jobLine(o) && <Typography variant="bodySm" weight="semibold">{jobLine(o)}</Typography>}
        </View>
      )}
      {o.stage !== 'READY' && o.stage !== 'NEW' && o.stage !== 'PREPARING' && jobLine(o) && (
        <Typography variant="caption" color={t.textSecondary}>{jobLine(o)}</Typography>
      )}

      {o.stage === 'RETURNING' && (
        <View style={[styles.pinBox, { backgroundColor: t.surfaceVariant }]}>
          <Typography variant="bodySm" weight="semibold" align="center">
            The driver couldn’t deliver ({(o.deliveryJob?.failReason ?? 'other').replace(/_/g, ' ').toLowerCase()}) and is bringing it back.
          </Typography>
          <Button label="We have it back" size="sm" onPress={() => run('received-back')} loading={act.isPending} />
        </View>
      )}
      {o.stage === 'NEW' && (
        <View style={styles.actions}>
          <Button label="Out of stock" variant="outline" size="sm" onPress={() => run('out-of-stock')} disabled={act.isPending} style={styles.flex} />
          <Button label="Accept" size="sm" onPress={() => run('accept')} loading={act.isPending} style={styles.flex} />
        </View>
      )}
      {o.stage === 'PREPARING' && (
        <View style={styles.actions}>
          <Button label="Out of stock" variant="outline" size="sm" onPress={() => run('out-of-stock')} disabled={act.isPending} style={styles.flex} />
          <Button label="Packed · ready for pickup" size="sm" onPress={() => run('ready')} loading={act.isPending} style={styles.flex2} />
        </View>
      )}
    </View>
  );
}

/** The live order queue for a store (owner: every branch; staff: their branch) */
export default function StoreOrders() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<StoreTab>('new');
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const { data: me, error: meError } = useStoreMe();
  const { data, isLoading, refetch, isRefetching, error } = useStoreOrders(tab, branchId);
  const [now, setNow] = useState(Date.now());

  // Keep the accept countdowns moving between refreshes
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (meError) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Typography color={t.textSecondary} align="center">{getErrorMessage(meError)}</Typography>
      </View>
    );
  }

  const counts = me?.counts;
  const tabLabel = (k: StoreTab) => (k !== 'history' && counts?.[k] ? `${TAB_LABELS[k]} (${counts[k]})` : TAB_LABELS[k]);
  const multiBranch = (me?.branches.length ?? 0) > 1;

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: me ? `Orders · ${me.storeName}` : 'Orders' }} />
      <View style={styles.header}>
        <View style={[styles.tabs, { backgroundColor: t.surfaceVariant }]}>
          {(Object.keys(TAB_LABELS) as StoreTab[]).map((k) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { backgroundColor: t.primary }]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Typography variant="caption" weight="bold" style={{ color: tab === k ? '#fff' : t.textSecondary }}>{tabLabel(k)}</Typography>
            </TouchableOpacity>
          ))}
        </View>
        {multiBranch && (
          <View style={styles.chips}>
            {[{ id: undefined, name: 'All branches' }, ...me!.branches].map((b) => (
              <TouchableOpacity key={b.id ?? 'all'} onPress={() => setBranchId(b.id)} style={[styles.chip, { backgroundColor: branchId === b.id ? t.primary : t.surfaceVariant }]}>
                <Typography variant="caption" weight="semibold" style={{ color: branchId === b.id ? '#fff' : t.text }}>{b.name}</Typography>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {tab === 'new' && (
          <View style={styles.inline}>
            <Clock size={12} color={t.textSecondary} />
            <Typography variant="caption" color={t.textSecondary}>Accept new orders quickly: unanswered orders go to another store.</Typography>
          </View>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator color={t.accent} style={styles.loading} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => <OrderCard o={item} showBranch={multiBranch && !branchId} now={now} />}
          ListEmptyComponent={
            <Typography variant="body" color={t.textSecondary} align="center" style={styles.loading}>
              {error ? getErrorMessage(error) : tab === 'new' ? 'No new orders right now.' : 'Nothing here.'}
            </Typography>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  tabs: { flexDirection: 'row', padding: 3, borderRadius: radius.md, gap: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  loading: { marginTop: spacing.xl },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  items: { gap: 4, marginVertical: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  pinBox: { borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, marginTop: spacing.xs },
  pin: { letterSpacing: 12, fontVariant: ['tabular-nums'] },
});
