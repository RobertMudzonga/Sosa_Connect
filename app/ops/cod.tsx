import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { money } from '@/src/components/ops/OpsShipmentCard';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCod, useOpsAction, opsApi, CodItem } from '@/src/hooks/useOps';
import { getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

function CashUp({ name, items }: { name: string; items: CodItem[] }) {
  const t = useMarketTheme();
  const totals = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.currency]: (acc[i.currency] ?? 0) + i.collectedAmount }), {});
  const [usd, setUsd] = useState('');
  const [zwg, setZwg] = useState('');
  const [note, setNote] = useState('');
  const verify = useOpsAction(() => opsApi.verifyCod({
    ids: items.map((i) => i.id),
    counted: { USD: Number(usd) || 0, ZWG: Number(zwg) || 0 },
    note: note.trim() || undefined,
  }));
  const short = items.filter((i) => i.short > 0);

  const go = async () => {
    try {
      const r = await verify.mutateAsync(undefined);
      notify(r.status === 'VERIFIED' ? 'Cash-up verified' : 'Discrepancy recorded', r.note ?? 'Counted cash matches the collections.');
    } catch (e) {
      notify('Could not record cash-up', getErrorMessage(e));
    }
  };

  return (
    <Panel title={name} right={<Typography variant="caption" color={t.textSecondary}>{items.length} parcels</Typography>}>
      {items.map((i) => (
        <View key={i.id} style={styles.rowBetween}>
          <Typography variant="caption" color={t.textSecondary} style={styles.flex}>{i.shipmentReference} · {formatDateTime(i.collectedAt)}</Typography>
          <Typography variant="caption" weight="bold" color={i.short > 0 ? t.warning : t.text}>
            {money(i.collectedAmount, i.currency)}{i.short > 0 ? ` (short ${money(i.short, i.currency)})` : ''}
          </Typography>
        </View>
      ))}
      <Typography variant="bodySm" weight="bold">
        Should hand in: {Object.entries(totals).map(([c, v]) => money(v, c as 'USD' | 'ZWG')).join(' + ')}
      </Typography>
      {short.length > 0 && <Typography variant="caption" color={t.warning}>{short.length} parcel(s) were not paid in full; this will be recorded as a discrepancy.</Typography>}
      <View style={styles.row2}>
        <View style={styles.flex}><Field label="USD counted" value={usd} onChangeText={setUsd} keyboardType="decimal-pad" placeholder="0.00" /></View>
        <View style={styles.flex}><Field label="ZiG counted" value={zwg} onChangeText={setZwg} keyboardType="decimal-pad" placeholder="0.00" /></View>
      </View>
      <Field label="Note (optional)" value={note} onChangeText={setNote} />
      <Button label="Record cash-up" size="sm" onPress={go} loading={verify.isPending} disabled={usd.trim() === '' && zwg.trim() === ''} />
    </Panel>
  );
}

export default function CodScreen() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<'COLLECTED' | 'DISCREPANCY' | 'VERIFIED'>('COLLECTED');
  const { data, isLoading } = useCod(tab);
  const byCollector = new Map<string, CodItem[]>();
  for (const i of data?.items ?? []) byCollector.set(i.collector.id, [...(byCollector.get(i.collector.id) ?? []), i]);

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Tabs value={tab} onChange={setTab} options={[{ value: 'COLLECTED', label: 'To count' }, { value: 'DISCREPANCY', label: 'Discrepancies' }, { value: 'VERIFIED', label: 'Verified' }]} />
      {isLoading && <ActivityIndicator color={t.accent} />}
      {tab === 'COLLECTED'
        ? [...byCollector.values()].map((items) => <CashUp key={items[0].collector.id} name={items[0].collector.name} items={items} />)
        : (data?.items ?? []).map((i) => (
          <Panel key={i.id} title={i.shipmentReference} right={<Pill label={i.status === 'VERIFIED' ? 'Verified' : 'Discrepancy'} tone={i.status === 'VERIFIED' ? 'good' : 'bad'} />}>
            <Typography variant="caption" color={t.textSecondary}>{i.collector.name} · collected {money(i.collectedAmount, i.currency)} of {money(i.expectedAmount, i.currency)}</Typography>
            {!!i.note && <Typography variant="caption" color={t.warning}>{i.note}</Typography>}
          </Panel>
        ))}
      {!isLoading && !data?.items.length && <Typography variant="bodySm" color={t.textSecondary} align="center">Nothing here.</Typography>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
});
