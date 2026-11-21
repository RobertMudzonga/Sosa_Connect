import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useHubInbound, useOpsAction, opsApi } from '@/src/hooks/useOps';
import type { InboundNotice } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

type Count = { received: string; damaged: string; bin: string };

function ReceiveCard({ n }: { n: InboundNotice }) {
  const t = useMarketTheme();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, Count>>(() =>
    Object.fromEntries(n.items.map((i) => [i.id, { received: String(i.quantityExpected), damaged: '0', bin: '' }])),
  );
  const [notes, setNotes] = useState('');
  const receive = useOpsAction(() => opsApi.receiveInbound(n.id, {
    items: n.items.map((i) => ({
      itemId: i.id,
      received: Math.max(0, Math.round(Number(counts[i.id].received) || 0)),
      damaged: Math.max(0, Math.round(Number(counts[i.id].damaged) || 0)),
      bin: counts[i.id].bin.trim() || undefined,
    })),
    notes: notes.trim() || undefined,
  }));
  const set = (id: string, patch: Partial<Count>) => setCounts((c) => ({ ...c, [id]: { ...c[id], ...patch } }));
  const receivedDone = n.status === 'RECEIVED';

  return (
    <Panel title={`${n.reference} · ${n.seller.name}`} right={<Pill label={receivedDone ? 'Received' : 'Expected'} tone={receivedDone ? 'good' : 'warn'} />}>
      <Typography variant="caption" color={t.textSecondary}>
        {n.totals.expected} units{n.carrier ? ` · ${n.carrier}` : ''}{n.expectedArrival ? ` · due ${new Date(n.expectedArrival).toLocaleDateString()}` : ''}
      </Typography>
      {receivedDone ? (
        <Typography variant="caption" color={t.textSecondary}>
          Received {n.totals.received}, damaged {n.totals.damaged}{n.totals.shortfall ? `, ${n.totals.shortfall} short` : ''}
        </Typography>
      ) : !open ? (
        <Button label="Count it in" size="sm" onPress={() => setOpen(true)} />
      ) : (
        <View style={styles.gap}>
          {n.items.map((i) => (
            <View key={i.id} style={styles.gapXs}>
              <Typography variant="bodySm" weight="semibold">{i.title}</Typography>
              <Typography variant="caption" color={t.textSecondary}>{i.quantityExpected} expected · {i.sku}</Typography>
              <View style={styles.row3}>
                <View style={styles.flex}><Field label="Good" value={counts[i.id].received} onChangeText={(v) => set(i.id, { received: v.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
                <View style={styles.flex}><Field label="Damaged" value={counts[i.id].damaged} onChangeText={(v) => set(i.id, { damaged: v.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
                <View style={styles.flex}><Field label="Shelf / bin" value={counts[i.id].bin} onChangeText={(v) => set(i.id, { bin: v.toUpperCase() })} placeholder="A-03-2" autoCapitalize="characters" /></View>
              </View>
            </View>
          ))}
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. one box crushed" />
          <View style={styles.row3}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} style={styles.flex} />
            <Button label="Confirm receipt" size="sm" loading={receive.isPending} style={styles.flex}
              onPress={() => receive.mutateAsync(undefined).catch((e) => notify('Could not receive', getErrorMessage(e)))} />
          </View>
          <Typography variant="caption" color={t.textSecondary}>Good units go on sale immediately. Damaged units are recorded for the seller.</Typography>
        </View>
      )}
    </Panel>
  );
}

export default function ReceivingScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'SUBMITTED' | 'RECEIVED'>('SUBMITTED');
  const { data, isLoading } = useHubInbound(tab);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'SUBMITTED', label: 'Expected' }, { value: 'RECEIVED', label: 'Received' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {(data ?? []).map((n) => <ReceiveCard key={n.id} n={n} />)}
      {!isLoading && data?.length === 0 && <Typography variant="bodySm" color={t.textSecondary} align="center">No deliveries {tab === 'SUBMITTED' ? 'expected' : 'received yet'}.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  gap: { gap: spacing.md },
  gapXs: { gap: 4 },
  row3: { flexDirection: 'row', gap: spacing.sm },
});
