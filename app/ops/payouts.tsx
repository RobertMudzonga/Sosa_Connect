import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { money } from '@/src/components/ops/OpsShipmentCard';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAdminPayouts, useOpsAction, opsApi } from '@/src/hooks/useOps';
import { getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const METHOD: Record<string, string> = { USD_BANK: 'USD bank (nostro)', ZWG_BANK: 'ZiG bank', ECOCASH_MERCHANT: 'EcoCash merchant' };

type AdminPayout = NonNullable<ReturnType<typeof useAdminPayouts>['data']>[number];

function PayoutCard({ p }: { p: AdminPayout }) {
  const t = useMarketTheme();
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const action = useOpsAction(({ kind, body }: { kind: 'approve' | 'paid' | 'reject'; body?: Record<string, string> }) => opsApi.payoutAction(p.id, kind, body));
  const run = (kind: 'approve' | 'paid' | 'reject', body?: Record<string, string>) =>
    action.mutateAsync({ kind, body }).catch((e) => notify('Could not update payout', getErrorMessage(e)));
  const open = p.status === 'REQUESTED' || p.status === 'APPROVED';

  return (
    <Panel title={`${money(p.amount, p.currency)} · ${p.sellerName ?? ''}`} right={<Pill label={p.status.toLowerCase()} tone={p.status === 'PAID' ? 'good' : p.status === 'REJECTED' ? 'bad' : 'warn'} />}>
      <Typography variant="caption" color={t.textSecondary}>{p.reference} · {formatDateTime(p.createdAt)} · {METHOD[p.method]}{p.currency === 'ZWG' ? ` · $${p.amountUsd.toFixed(2)} at ${p.exchangeRate}` : ''}</Typography>
      <View style={[styles.dest, { backgroundColor: t.surfaceVariant }]}>
        {Object.entries(p.destination ?? {}).map(([k, v]) => (
          <Typography key={k} variant="caption"><Typography variant="caption" color={t.textSecondary}>{k}: </Typography>{v}</Typography>
        ))}
      </View>
      {p.externalRef && <Typography variant="caption" color={t.textSecondary}>Paid · ref {p.externalRef}</Typography>}
      {p.note && <Typography variant="caption" color={t.textSecondary}>{p.note}</Typography>}
      {open && (
        <>
          <View style={styles.row}>
            <View style={styles.flex}><Field label="Bank / transfer reference" value={ref} onChangeText={setRef} placeholder="e.g. FT26112100123" /></View>
          </View>
          <View style={styles.row}>
            {p.status === 'REQUESTED' && <Button label="Approve" variant="outline" size="sm" onPress={() => run('approve')} loading={action.isPending} style={styles.flex} />}
            <Button label="Mark paid" size="sm" disabled={ref.trim().length < 3} onPress={() => run('paid', { externalRef: ref.trim() })} loading={action.isPending} style={styles.flex} />
          </View>
          <Field label="Reason (to reject)" value={note} onChangeText={setNote} />
          <Button label="Reject and return funds" variant="ghost" size="sm" disabled={note.trim().length < 3} onPress={() => run('reject', { note: note.trim() })} />
        </>
      )}
    </Panel>
  );
}

export default function PayoutsAdmin() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED'>('REQUESTED');
  const { data, isLoading } = useAdminPayouts(tab);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'REQUESTED', label: 'Requested' }, { value: 'APPROVED', label: 'Approved' }, { value: 'PAID', label: 'Paid' }, { value: 'REJECTED', label: 'Rejected' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {(data ?? []).map((p) => <PayoutCard key={p.id} p={p} />)}
      {!isLoading && !data?.length && <Typography variant="bodySm" color={t.textSecondary} align="center">No payouts here.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.sm },
  dest: { borderRadius: 8, padding: spacing.sm, gap: 2 },
});
