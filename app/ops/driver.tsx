import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field } from '@/src/components/merchant/ui';
import { OpsShipmentCard, money } from '@/src/components/ops/OpsShipmentCard';
import { HandoverForm } from '@/src/components/ops/HandoverForm';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useDriverShipments, useOpsAction, opsApi, OpsShipment } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const FAIL_REASONS = [
  { value: 'NOT_HOME', label: 'Not home' },
  { value: 'WRONG_ADDRESS', label: 'Wrong address' },
  { value: 'REFUSED', label: 'Refused' },
  { value: 'OTHER', label: 'Other' },
];

function DriverCard({ s }: { s: OpsShipment }) {
  const t = useMarketTheme();
  const [mode, setMode] = useState<'deliver' | 'fail' | null>(null);
  const [reason, setReason] = useState('NOT_HOME');
  const [note, setNote] = useState('');
  const fail = useOpsAction(() => opsApi.fail(s.id, { reason, note: note.trim() || undefined }));
  const active = s.status === 'OUT_FOR_DELIVERY';

  return (
    <OpsShipmentCard s={s}>
      {active && mode === null && (
        <View style={styles.row2}>
          <Button label="Couldn't deliver" variant="outline" size="sm" onPress={() => setMode('fail')} style={styles.flex} />
          <Button label="Deliver" size="sm" onPress={() => setMode('deliver')} style={styles.flex} />
        </View>
      )}
      {mode === 'deliver' && <HandoverForm s={s} onDone={() => setMode(null)} label="Confirm delivery" />}
      {mode === 'fail' && (
        <View style={styles.form}>
          <View style={styles.chips}>
            {FAIL_REASONS.map((r) => (
              <TouchableOpacity key={r.value} onPress={() => setReason(r.value)} style={[styles.chip, { backgroundColor: reason === r.value ? t.primary : t.surfaceVariant }]}>
                <Typography variant="caption" weight="bold" style={{ color: reason === r.value ? '#fff' : t.text }}>{r.label}</Typography>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. gate locked, no answer" />
          <Typography variant="caption" color={t.textSecondary}>
            {reason === 'REFUSED' ? 'A refused parcel goes back to stock.' : 'The parcel goes back to the hub for another try.'}
          </Typography>
          <View style={styles.row2}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setMode(null)} style={styles.flex} />
            <Button label="Record attempt" size="sm" loading={fail.isPending} style={styles.flex}
              onPress={() => fail.mutateAsync(undefined).then(() => setMode(null)).catch((e) => notify('Could not record', getErrorMessage(e)))} />
          </View>
        </View>
      )}
    </OpsShipmentCard>
  );
}

export default function DriverScreen() {
  const t = useMarketTheme();
  const { data, isLoading, refetch, isRefetching } = useDriverShipments();
  const out = (data ?? []).filter((s) => s.status === 'OUT_FOR_DELIVERY');
  const cash = (data ?? []).filter((s) => s.cashCollected !== null).reduce<Record<string, number>>((acc, s) => {
    acc[s.cashToCollect!.currency] = (acc[s.cashToCollect!.currency] ?? 0) + s.cashCollected!;
    return acc;
  }, {});

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      data={data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={
        <Typography variant="bodySm" color={t.textSecondary}>
          {out.length} to deliver{Object.keys(cash).length ? ` · cash on hand ${Object.entries(cash).map(([c, v]) => money(v, c as 'USD' | 'ZWG')).join(' + ')}` : ''}
        </Typography>
      }
      renderItem={({ item }) => <DriverCard s={item} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          {isLoading ? <ActivityIndicator color={t.accent} /> : <Typography variant="bodySm" color={t.textSecondary} align="center">No parcels assigned to you yet.</Typography>}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  empty: { marginTop: 80, paddingHorizontal: spacing.lg },
});
