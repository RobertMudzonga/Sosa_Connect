import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Tabs } from '@/src/components/merchant/ui';
import { OpsShipmentCard } from '@/src/components/ops/OpsShipmentCard';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useHubQueue, usePickList, useDrivers, useOpsAction, opsApi, OpsShipment } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

type Tab = 'to_pick' | 'packed' | 'out' | 'done';

function DispatchForm({ s, onDone }: { s: OpsShipment; onDone: () => void }) {
  const t = useMarketTheme();
  const { data: drivers } = useDrivers();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const dispatch = useOpsAction((body: { driverId?: string; courierName?: string; trackingNumber?: string }) => opsApi.dispatch(s.id, body));
  const metro = s.order.deliveryMode === 'DELIVERY' && s.tier.startsWith('METRO');
  const pickup = s.order.deliveryMode === 'PICKUP';

  const go = async () => {
    try {
      await dispatch.mutateAsync(metro ? { driverId: driverId! } : { courierName: courier.trim() || undefined, trackingNumber: tracking.trim() || undefined });
      onDone();
    } catch (e) {
      notify('Could not dispatch', getErrorMessage(e));
    }
  };

  return (
    <View style={styles.form}>
      {metro ? (
        <>
          <Typography variant="bodySm" weight="semibold">Driver</Typography>
          <View style={styles.chips}>
            {(drivers ?? []).map((d) => (
              <TouchableOpacity key={d.id} onPress={() => setDriverId(d.id)} style={[styles.chip, { backgroundColor: driverId === d.id ? t.primary : t.surfaceVariant }]}>
                <Typography variant="caption" weight="bold" style={{ color: driverId === d.id ? '#fff' : t.text }}>{d.name} · {d.outForDelivery} out</Typography>
              </TouchableOpacity>
            ))}
            {drivers?.length === 0 && <Typography variant="caption" color={t.textSecondary}>No drivers at this hub. Ask an admin to add one.</Typography>}
          </View>
        </>
      ) : (
        <View style={styles.row2}>
          <View style={styles.flex}><Field label={pickup ? 'Vehicle / courier (optional)' : 'Courier'} value={courier} onChangeText={setCourier} placeholder={pickup ? 'Kuwana van' : 'e.g. Swift'} /></View>
          <View style={styles.flex}><Field label="Tracking (optional)" value={tracking} onChangeText={setTracking} /></View>
        </View>
      )}
      <View style={styles.row2}>
        <Button label="Cancel" variant="ghost" size="sm" onPress={onDone} style={styles.flex} />
        <Button label={metro ? 'Send out' : pickup ? 'Send to pickup point' : 'Hand to courier'} size="sm" loading={dispatch.isPending}
          disabled={metro ? !driverId : !pickup && courier.trim().length < 2} onPress={go} style={styles.flex} />
      </View>
    </View>
  );
}

function HubCard({ s }: { s: OpsShipment }) {
  const [dispatching, setDispatching] = useState(false);
  const pack = useOpsAction(() => opsApi.pack(s.id));
  const run = (p: Promise<unknown>) => p.catch((e) => notify('Could not update', getErrorMessage(e)));
  return (
    <OpsShipmentCard s={s} showBins={s.status === 'PROCESSING'}>
      {s.status === 'PROCESSING' && <Button label="Picked & packed" size="sm" onPress={() => run(pack.mutateAsync(undefined))} loading={pack.isPending} />}
      {s.status === 'PACKED' && !dispatching && <Button label="Dispatch" size="sm" onPress={() => setDispatching(true)} />}
      {dispatching && <DispatchForm s={s} onDone={() => setDispatching(false)} />}
    </OpsShipmentCard>
  );
}

export default function HubScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<Tab>('to_pick');
  const [showPick, setShowPick] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useHubQueue(tab);
  const { data: pick } = usePickList(showPick && tab === 'to_pick');

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <View style={styles.top}>
        <Tabs value={tab} onChange={setTab} options={[{ value: 'to_pick', label: 'To pick' }, { value: 'packed', label: 'Packed' }, { value: 'out', label: 'Out' }, { value: 'done', label: 'Done' }]} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={tab === 'to_pick' && (data?.length ?? 0) > 0 ? (
          <View style={styles.gap}>
            <Button label={showPick ? 'Hide pick list' : 'Show pick list (by shelf)'} variant="outline" size="sm" onPress={() => setShowPick((v) => !v)} />
            {showPick && (
              <Panel title="Pick list">
                {(pick ?? []).map((p) => (
                  <View key={p.offerId} style={styles.pickRow}>
                    <Typography variant="bodySm" weight="bold" color={p.bin ? t.accent : t.textSecondary} style={styles.bin}>{p.bin ?? '—'}</Typography>
                    <Typography variant="bodySm" style={styles.flex} numberOfLines={2}>{p.title}</Typography>
                    <Typography variant="bodySm" weight="bold">× {p.quantity}</Typography>
                  </View>
                ))}
              </Panel>
            )}
          </View>
        ) : null}
        renderItem={({ item }) => <HubCard s={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={t.accent} /> : <Typography variant="bodySm" color={t.textSecondary} align="center">Nothing here right now.</Typography>}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { padding: spacing.lg, paddingBottom: 0 },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  gap: { gap: spacing.sm, marginBottom: spacing.sm },
  form: { gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bin: { width: 70 },
  empty: { marginTop: 80, paddingHorizontal: spacing.lg },
});
