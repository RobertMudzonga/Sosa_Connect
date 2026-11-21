import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Switch, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsReturns, useOpsAction, opsApi, ReturnRequest, RETURN_REASON_LABEL } from '@/src/hooks/useOps';
import { getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const STATUS: Record<ReturnRequest['status'], { label: string; tone: 'info' | 'warn' | 'good' | 'bad' }> = {
  APPROVED: { label: 'Waiting for drop-off', tone: 'warn' },
  DROPPED_OFF: { label: 'On its way to hub', tone: 'info' },
  RECEIVED: { label: 'To inspect', tone: 'warn' },
  REFUNDED: { label: 'Refunded', tone: 'good' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
};

function Inspect({ r }: { r: ReturnRequest }) {
  const t = useMarketTheme();
  const [note, setNote] = useState('');
  const [resellable, setResellable] = useState<string[]>([]);
  const [sellerFault, setSellerFault] = useState(r.reason !== 'DAMAGED_IN_TRANSIT');
  const inspect = useOpsAction((approve: boolean) => opsApi.inspect(r.id, { approve, note: note.trim(), sellerAtFault: sellerFault, resellableItemIds: resellable }));
  const run = (approve: boolean) => inspect.mutateAsync(approve).catch((e) => notify('Could not record inspection', getErrorMessage(e)));
  const total = r.items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);

  return (
    <View style={styles.gap}>
      {r.items.filter((i) => i.fulfilmentType === 'PLATFORM_FULFILLED').map((i) => {
        const on = resellable.includes(i.id);
        return (
          <TouchableOpacity key={i.id} style={styles.inline} onPress={() => setResellable((l) => (on ? l.filter((x) => x !== i.id) : [...l, i.id]))}>
            <View style={[styles.check, { borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent' }]}>{on && <Check size={12} color="#fff" />}</View>
            <Typography variant="caption">Put {i.title} back on sale</Typography>
          </TouchableOpacity>
        );
      })}
      <View style={styles.rowBetween}>
        <Typography variant="bodySm">Seller&apos;s fault (counts toward dispute rate)</Typography>
        <Switch value={sellerFault} onValueChange={setSellerFault} />
      </View>
      <Field label="Inspection note" value={note} onChangeText={setNote} placeholder="What did you find?" />
      <View style={styles.row2}>
        <Button label="Reject" variant="outline" size="sm" disabled={note.trim().length < 3} loading={inspect.isPending} onPress={() => run(false)} style={styles.flex} />
        <Button label={`Refund ${usd(total)}`} size="sm" disabled={note.trim().length < 3} loading={inspect.isPending} onPress={() => run(true)} style={styles.flex} />
      </View>
    </View>
  );
}

function ReturnCard({ r }: { r: ReturnRequest }) {
  const t = useMarketTheme();
  const received = useOpsAction(() => opsApi.returnReceived(r.id));
  const s = STATUS[r.status];
  return (
    <Panel title={r.reference} right={<Pill label={s.label} tone={s.tone} />}>
      <Typography variant="caption" color={t.textSecondary}>
        {RETURN_REASON_LABEL[r.reason]} · order {r.order.reference} · {r.buyer.name} · {formatDateTime(r.createdAt)}
      </Typography>
      {!!r.details && <Typography variant="caption">“{r.details}”</Typography>}
      {r.items.map((i) => <Typography key={i.id} variant="bodySm">{i.quantity} × {i.title} · {usd(i.unitPriceUsd * i.quantity)}</Typography>)}
      <Typography variant="caption" color={t.textSecondary}>
        {r.method === 'DROP_OFF' ? `Drop-off at ${r.pickupPoint?.name}` : 'Courier collection'} · refund to {r.refundDestination === 'WALLET' ? 'wallet' : 'original payment'}
        {r.refundManual ? ' · manual refund needed' : ''}
      </Typography>
      {(r.status === 'APPROVED' || r.status === 'DROPPED_OFF') && (
        <Button label="Received at hub" size="sm" loading={received.isPending}
          onPress={() => received.mutateAsync(undefined).catch((e) => notify('Could not update', getErrorMessage(e)))} />
      )}
      {r.status === 'RECEIVED' && <Inspect r={r} />}
      {!!r.inspectionNote && <Typography variant="caption" color={t.textSecondary}>Inspection: {r.inspectionNote}</Typography>}
    </Panel>
  );
}

export default function ReturnsScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'open' | 'REFUNDED' | 'REJECTED'>('open');
  const { data, isLoading } = useOpsReturns(tab === 'open' ? undefined : tab);
  const sorted = (data ?? []).slice().sort((a, b) => (a.status === 'RECEIVED' ? -1 : 0) - (b.status === 'RECEIVED' ? -1 : 0));
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'open', label: 'Open' }, { value: 'REFUNDED', label: 'Refunded' }, { value: 'REJECTED', label: 'Rejected' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {sorted.map((r) => <ReturnCard key={r.id} r={r} />)}
      {!isLoading && !sorted.length && <Typography variant="bodySm" color={t.textSecondary} align="center">No returns here.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  gap: { gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  check: { width: 18, height: 18, borderRadius: radius.xs, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
