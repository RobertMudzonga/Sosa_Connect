import React, { useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { OpsShipmentCard } from '@/src/components/ops/OpsShipmentCard';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { usePickupShipments, useOpsReturns, useOpsAction, opsApi, OpsShipment, ReturnRequest } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';
import { HandoverForm } from '@/src/components/ops/HandoverForm';

function ParcelCard({ s }: { s: OpsShipment }) {
  const [handing, setHanding] = useState(false);
  const arrived = useOpsAction(() => opsApi.arrived(s.id));
  return (
    <OpsShipmentCard s={s}>
      {s.status === 'DISPATCHED' && (
        <Button label="Parcel has arrived" size="sm" loading={arrived.isPending}
          onPress={() => arrived.mutateAsync(undefined).catch((e) => notify('Could not update', getErrorMessage(e)))} />
      )}
      {s.status === 'READY_FOR_COLLECTION' && !handing && <Button label="Hand over" size="sm" onPress={() => setHanding(true)} />}
      {handing && <HandoverForm s={s} onDone={() => setHanding(false)} label="Confirm collection" />}
    </OpsShipmentCard>
  );
}

function ReturnDropOff({ r }: { r: ReturnRequest }) {
  const t = useMarketTheme();
  const take = useOpsAction(() => opsApi.returnDroppedOff(r.id));
  return (
    <Panel title={r.reference} right={<Pill label="Return" tone="warn" />}>
      <Typography variant="caption" color={t.textSecondary}>From {r.buyer.name} · order {r.order.reference}</Typography>
      {r.items.map((i) => <Typography key={i.id} variant="bodySm">{i.quantity} × {i.title}</Typography>)}
      <Typography variant="caption" color={t.textSecondary}>Check the code {r.reference} is written on the parcel before you accept it.</Typography>
      <Button label="Accept drop-off" size="sm" loading={take.isPending}
        onPress={() => take.mutateAsync(undefined).catch((e) => notify('Could not accept', getErrorMessage(e)))} />
    </Panel>
  );
}

export default function PickupScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'incoming' | 'ready' | 'returns' | 'done'>('ready');
  const { data: parcels, isLoading } = usePickupShipments();
  const { data: returns } = useOpsReturns('APPROVED');
  const groups = {
    incoming: (parcels ?? []).filter((s) => s.status === 'DISPATCHED'),
    ready: (parcels ?? []).filter((s) => s.status === 'READY_FOR_COLLECTION'),
    done: (parcels ?? []).filter((s) => s.status === 'COLLECTED'),
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[
        { value: 'ready', label: `Ready (${groups.ready.length})` },
        { value: 'incoming', label: `Coming (${groups.incoming.length})` },
        { value: 'returns', label: `Returns (${returns?.length ?? 0})` },
        { value: 'done', label: 'Collected' },
      ]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {tab === 'returns'
        ? (returns ?? []).map((r) => <ReturnDropOff key={r.id} r={r} />)
        : groups[tab].map((s) => <ParcelCard key={s.id} s={s} />)}
      {!isLoading && (tab === 'returns' ? !returns?.length : !groups[tab].length) && (
        <Typography variant="bodySm" color={t.textSecondary} align="center">Nothing here right now.</Typography>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
});
