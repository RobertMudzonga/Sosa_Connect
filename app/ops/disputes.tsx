import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs, parseAmount, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useDisputes, DisputeRow } from '@/src/hooks/useControl';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const REASON: Record<string, string> = { DEFECTIVE: 'Faulty', WRONG_ITEM: 'Wrong item', DAMAGED_IN_TRANSIT: 'Damaged in delivery', NOT_AS_DESCRIBED: 'Not as described' };
const STATUS: Record<string, string> = { APPROVED: 'Waiting for item', DROPPED_OFF: 'Handed in', RECEIVED: 'At hub', REFUNDED: 'Refunded', REJECTED: 'Declined', CANCELLED: 'Cancelled' };

function DisputeCard({ d }: { d: DisputeRow }) {
  const t = useMarketTheme();
  const open = ['APPROVED', 'DROPPED_OFF', 'RECEIVED'].includes(d.status);
  const [payer, setPayer] = useState<'STORE' | 'PLATFORM'>(d.reason === 'DAMAGED_IN_TRANSIT' ? 'PLATFORM' : 'STORE');
  const [amount, setAmount] = useState(String(d.fullValueUsd));
  const [restock, setRestock] = useState(false);
  const [note, setNote] = useState('');
  const resolve = useOpsAction((outcome: 'REFUND' | 'REJECT') => controlApi.resolveDispute(d.id, outcome === 'REFUND'
    ? { outcome, payer, amountUsd: parseAmount(amount) ?? undefined, restock, note: note.trim() }
    : { outcome, note: note.trim() }));
  const holdOrder = useOpsAction((reason: string | null) => controlApi.holdOrder(d.order.id, reason));
  const value = parseAmount(amount);
  const amountError = !value ? 'Enter the refund' : value > d.fullValueUsd ? `At most ${usd(d.fullValueUsd)}` : null;
  const run = (outcome: 'REFUND' | 'REJECT') => resolve.mutateAsync(outcome)
    .then(() => notify(outcome === 'REFUND' ? 'Refunded to the buyer’s wallet' : 'Return declined', ''))
    .catch((e) => notify('Not done', getErrorMessage(e)));

  return (
    <Panel title={`${d.reference} · ${REASON[d.reason] ?? d.reason}`} right={<Pill label={STATUS[d.status] ?? d.status} tone={d.status === 'REFUNDED' ? 'good' : d.status === 'REJECTED' ? 'bad' : 'warn'} />}>
      <Typography variant="bodySm">{d.items.map((i) => `${i.quantity} × ${i.title}`).join(' · ')} · {usd(d.fullValueUsd)}</Typography>
      {!!d.details && <Typography variant="caption" color={t.textSecondary}>“{d.details}”</Typography>}
      <Typography variant="caption" color={t.textSecondary}>
        {d.buyer.name}{d.buyer.phone ? ` · ${d.buyer.phone}` : ''} · order {d.order.reference} · {formatDateTime(d.createdAt)}
      </Typography>
      {d.stores.map((s) => (
        <Typography key={s.id} variant="caption" color={t.textSecondary}>Store: {s.name} · disputes {s.disputeRate.toFixed(1)}%{s.payoutsHeld ? ' · payouts on hold' : ''}</Typography>
      ))}
      {!!d.refundUsd && <Typography variant="caption" weight="semibold">{usd(d.refundUsd)} refunded · paid by {d.refundPaidBy === 'PLATFORM' ? 'Kuwana' : 'the store'}</Typography>}
      {!!d.inspectionNote && <Typography variant="caption" color={t.textSecondary}>Note: {d.inspectionNote}</Typography>}

      {open && (
        <View style={styles.gap}>
          <View style={styles.rowBetween}>
            <Typography variant="caption" style={styles.flex}>
              {d.orderPayoutHold ? `Store earnings frozen: ${d.orderPayoutHold.reason ?? ''}` : 'Store earnings release normally after the escrow period'}
            </Typography>
            <Button label={d.orderPayoutHold ? 'Release' : 'Freeze'} size="sm" variant="ghost" loading={holdOrder.isPending}
              onPress={() => holdOrder.mutateAsync(d.orderPayoutHold ? null : `Dispute ${d.reference}`).catch((e) => notify('Not done', getErrorMessage(e)))} />
          </View>
          <Tabs value={payer} onChange={setPayer} options={[{ value: 'STORE', label: 'Store pays' }, { value: 'PLATFORM', label: 'Kuwana pays (goodwill)' }]} />
          <Field label="Refund to wallet (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" hint={amountError ?? (value && value < d.fullValueUsd ? 'Partial refund' : 'Full item value')} />
          <View style={styles.rowBetween}>
            <Typography variant="bodySm" style={styles.flex}>Item is back at the store and sellable: restock it</Typography>
            <Switch value={restock} onValueChange={setRestock} />
          </View>
          <Field label="Decision note (sent to the buyer if declined)" value={note} onChangeText={setNote} />
          <View style={styles.row}>
            <Button label="Decline" variant="outline" size="sm" style={styles.flex} disabled={note.trim().length < 3} loading={resolve.isPending && resolve.variables === 'REJECT'} onPress={() => run('REJECT')} />
            <Button label={`Refund ${value ? usd(value) : ''}`} size="sm" style={styles.flex} disabled={note.trim().length < 3 || !!amountError} loading={resolve.isPending && resolve.variables === 'REFUND'} onPress={() => run('REFUND')} />
          </View>
          <Typography variant="caption" color={t.textSecondary}>
            {payer === 'STORE' ? 'The refund comes out of the store’s earnings for these items and counts toward its dispute rate.' : 'Kuwana absorbs the refund; the store keeps its earnings.'} Settling releases the freeze on this order.
          </Typography>
        </View>
      )}
    </Panel>
  );
}

/** Admin: returns and disputes, settled in one step */
export default function DisputesScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'OPEN' | 'REFUNDED' | 'REJECTED'>('OPEN');
  const { data, isLoading } = useDisputes(tab);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'OPEN', label: 'Open' }, { value: 'REFUNDED', label: 'Refunded' }, { value: 'REJECTED', label: 'Declined' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {(data ?? []).map((d) => <DisputeCard key={d.id} d={d} />)}
      {!isLoading && !data?.length && <Typography variant="bodySm" color={t.textSecondary} align="center">Nothing here.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  gap: { gap: spacing.sm, marginTop: spacing.xs },
});
