import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, StatTile, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useDispatchBoard, useReassignCandidates, DelayReason, LateParcel } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const REASON: Record<DelayReason, string> = {
  STORE_NOT_ACCEPTED: 'Store hasn’t accepted',
  STORE_NOT_PACKED: 'Store hasn’t packed',
  NO_DRIVER: 'No driver has taken it',
  PICKUP_LATE: 'Driver hasn’t collected',
  DELIVERY_LATE: 'Late on the road',
  RETURN_LATE: 'Return not back at store',
};

function Call({ phone, label }: { phone?: string | null; label: string }) {
  const t = useMarketTheme();
  if (!phone) return null;
  return (
    <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.inline} accessibilityLabel={`Call ${label}`}>
      <Phone size={13} color={t.accent} /><Typography variant="caption" weight="semibold" color={t.accent}>{label}</Typography>
    </TouchableOpacity>
  );
}

function LateCard({ p }: { p: LateParcel }) {
  const t = useMarketTheme();
  const [mode, setMode] = useState<'REASSIGN' | 'CANCEL' | 'RELEASE_DRIVER' | null>(null);
  const [note, setNote] = useState('');
  const { data: candidates, isLoading } = useReassignCandidates(mode === 'REASSIGN' ? p.shipmentId : undefined);
  const reassign = useOpsAction((branchId?: string) => controlApi.reassign(p.shipmentId, { branchId, note: note.trim() || undefined }));
  const cancel = useOpsAction(() => controlApi.cancelParcel(p.shipmentId, note.trim()));
  const release = useOpsAction(() => controlApi.releaseDriver(p.shipmentId, note.trim()));
  const done = (title: string) => () => { setMode(null); setNote(''); notify(title, ''); };
  const err = (title: string) => (e: unknown) => notify(title, getErrorMessage(e));

  return (
    <Panel title={`${p.reference} · ${REASON[p.reason]}`} right={<Pill label={`${p.minutesLate} min late`} tone={p.minutesLate > 30 ? 'bad' : 'warn'} />}>
      <Typography variant="bodySm">{p.items.join(' · ')}</Typography>
      <Typography variant="caption" color={t.textSecondary}>
        {p.store?.name ?? '—'}{p.reassignCount ? ` · moved ${p.reassignCount}×` : ''}{p.job ? ` · ${p.job.distanceKm.toFixed(1)} km · parcel ${usd(p.job.parcelValueUsd)}` : ''} · {p.order.paymentMethod === 'CASH' ? 'cash on delivery' : 'prepaid'}
      </Typography>
      {p.driver && <Typography variant="caption" color={t.textSecondary}>Driver: {p.driver.name ?? 'unnamed'}{p.driver.vehicleReg ? ` (${p.driver.vehicleReg})` : ''}</Typography>}
      <View style={styles.links}>
        <Call phone={p.store?.phone} label="Store" />
        <Call phone={p.driver?.phone} label="Driver" />
        <Call phone={p.buyer.phone} label="Buyer" />
      </View>

      {!mode && (
        <View style={styles.actions}>
          {p.actions.includes('REASSIGN') && <Button label="Move to another store" size="sm" variant="outline" onPress={() => setMode('REASSIGN')} />}
          {p.actions.includes('RELEASE_DRIVER') && <Button label="Take off driver" size="sm" variant="outline" onPress={() => setMode('RELEASE_DRIVER')} />}
          {p.actions.includes('CANCEL') && <Button label="Cancel & refund" size="sm" variant="ghost" onPress={() => setMode('CANCEL')} />}
        </View>
      )}

      {mode === 'REASSIGN' && (
        <View style={styles.gap}>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Store not answering" />
          <Button label="Best available store" size="sm" loading={reassign.isPending} onPress={() => reassign.mutateAsync(undefined).then(done('Parcel moved')).catch(err('Could not move'))} />
          {isLoading && <ActivityIndicator color={t.accent} />}
          {(candidates ?? []).map((c) => (
            <TouchableOpacity key={c.id} disabled={!c.canFill || reassign.isPending} onPress={() => reassign.mutateAsync(c.id).then(done('Parcel moved')).catch(err('Could not move'))}
              style={[styles.candidate, { borderColor: t.border, opacity: c.canFill ? 1 : 0.5 }]}>
              <Typography variant="bodySm" style={styles.flex}>{c.name}</Typography>
              <Typography variant="caption" color={c.canFill ? t.success : t.textSecondary}>{c.canFill ? (c.isPaused ? 'Has stock · paused' : 'Has stock') : 'Missing items'}</Typography>
            </TouchableOpacity>
          ))}
          <Typography variant="caption" color={t.textSecondary}>The old store isn’t penalised. The buyer’s price doesn’t change; a different driver fee changes Kuwana’s margin.</Typography>
          <Button label="Back" size="sm" variant="ghost" onPress={() => setMode(null)} />
        </View>
      )}
      {(mode === 'CANCEL' || mode === 'RELEASE_DRIVER') && (
        <View style={styles.gap}>
          <Field label={mode === 'CANCEL' ? 'Reason (sent to the buyer)' : 'Reason (sent to the driver)'} value={note} onChangeText={setNote} />
          <View style={styles.actions}>
            <Button label="Back" size="sm" variant="ghost" onPress={() => setMode(null)} />
            {mode === 'CANCEL'
              ? <Button label="Cancel parcel & refund wallet" size="sm" variant="danger" disabled={note.trim().length < 3} loading={cancel.isPending}
                  onPress={() => cancel.mutateAsync(undefined).then((r) => done(`Cancelled · ${usd(r.refundUsd)} refunded`)()).catch(err('Could not cancel'))} />
              : <Button label="Take off driver & re-offer" size="sm" disabled={note.trim().length < 3} loading={release.isPending}
                  onPress={() => release.mutateAsync(undefined).then(done('Job re-offered to drivers')).catch(err('Could not release'))} />}
          </View>
        </View>
      )}
    </Panel>
  );
}

/** Admin: store parcels running late, worst first, with one-tap overrides */
export default function DispatchScreen() {
  const t = useMarketTheme();
  const { data, isLoading, refetch, isRefetching } = useDispatchBoard();
  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  const l = data.live;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
      <View style={styles.tiles}>
        <StatTile label="At the store" value={l.atStore} />
        <StatTile label="Need a driver" value={l.waitingForDriver} tone={l.waitingForDriver ? 'warn' : undefined} />
        <StatTile label="On the road" value={l.goingToStore + l.onTheRoad} hint={`${l.goingToStore} going to stores`} />
      </View>
      <Typography variant="body" weight="bold">Late ({data.late.length})</Typography>
      {data.late.length === 0 && <Typography variant="bodySm" color={t.textSecondary}>Nothing is late. Refreshes every 30 seconds.</Typography>}
      {data.late.map((p) => <LateCard key={p.shipmentId} p={p} />)}
      <Typography variant="caption" color={t.textSecondary}>
        Late means: past the store’s accept or packing deadline; no driver after {data.thresholds.noDriverMinutes} min; not collected {data.thresholds.pickupMinutes} min after claiming; on the road longer than 3 min/km + {data.thresholds.deliverySlackMinutes} min; a failed delivery not back after {data.thresholds.returnMinutes} min.
      </Typography>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  links: { flexDirection: 'row', gap: spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gap: { gap: spacing.sm },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
});
