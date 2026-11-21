import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { api } from '@/src/services/api';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

type Vehicle = 'BIKE' | 'CAR' | 'BAKKIE';
type Band = { maxKm: string; customerFeeUsd: string; driverFeeUsd: string };
const VEHICLES: { value: Vehicle; label: string }[] = [{ value: 'BIKE', label: 'Motorbike' }, { value: 'CAR', label: 'Car' }, { value: 'BAKKIE', label: 'Bakkie' }];

/** Admin: what buyers pay and drivers earn, by vehicle and distance */
export default function OpsFees() {
  const t = useMarketTheme();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ops', 'fee-bands'],
    queryFn: async () => (await api.get('/market/delivery-fees')).data.data as { vehicleClass: Vehicle; bands: { maxKm: number; customerFeeUsd: number; driverFeeUsd: number }[] }[],
  });
  const [form, setForm] = useState<Record<Vehicle, Band[]>>({ BIKE: [], CAR: [], BAKKIE: [] });
  useEffect(() => {
    if (!data) return;
    setForm(Object.fromEntries(data.map((v) => [v.vehicleClass, v.bands.map((b) => ({ maxKm: String(b.maxKm), customerFeeUsd: String(b.customerFeeUsd), driverFeeUsd: String(b.driverFeeUsd) }))])) as Record<Vehicle, Band[]>);
  }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const bands = VEHICLES.flatMap(({ value }) => form[value].map((b) => ({ vehicleClass: value, maxKm: Number(b.maxKm), customerFeeUsd: Number(b.customerFeeUsd), driverFeeUsd: Number(b.driverFeeUsd) })));
      return (await api.put('/market/delivery-fees', { bands })).data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ops', 'fee-bands'] }); notify('Saved', 'New fees apply to new quotes and orders.'); },
    onError: (e) => notify('Could not save', getErrorMessage(e)),
  });
  const set = (v: Vehicle, i: number, k: keyof Band, val: string) => setForm((f) => ({ ...f, [v]: f[v].map((b, j) => (j === i ? { ...b, [k]: val } : b)) }));

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Each band covers trips up to its distance (straight line, store to drop-off). Kuwana keeps the difference between the buyer’s fee and the driver’s pay. Pickup-point drops get the discount set in Rates & rules.
      </Typography>
      {VEHICLES.map(({ value, label }) => (
        <Panel key={value} title={label}>
          {form[value].map((b, i) => {
            const margin = Number(b.customerFeeUsd) - Number(b.driverFeeUsd);
            return (
              <View key={i} style={styles.band}>
                <View style={styles.cell}><Field label="Up to km" value={b.maxKm} onChangeText={(x) => set(value, i, 'maxKm', x)} keyboardType="decimal-pad" /></View>
                <View style={styles.cell}><Field label="Buyer pays $" value={b.customerFeeUsd} onChangeText={(x) => set(value, i, 'customerFeeUsd', x)} keyboardType="decimal-pad" /></View>
                <View style={styles.cell}><Field label="Driver gets $" value={b.driverFeeUsd} onChangeText={(x) => set(value, i, 'driverFeeUsd', x)} keyboardType="decimal-pad" hint={Number.isFinite(margin) ? `Kuwana keeps $${margin.toFixed(2)}` : undefined} /></View>
                <TouchableOpacity onPress={() => setForm((f) => ({ ...f, [value]: f[value].filter((_, j) => j !== i) }))} accessibilityLabel="Remove band" style={styles.remove}>
                  <Trash2 size={16} color={t.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
          <Button label="Add a band" variant="ghost" size="sm" onPress={() => setForm((f) => ({ ...f, [value]: [...f[value], { maxKm: '', customerFeeUsd: '', driverFeeUsd: '' }] }))} />
        </Panel>
      ))}
      <Button label="Save delivery fees" size="lg" onPress={() => save.mutate()} loading={save.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  band: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  cell: { flex: 1 },
  remove: { paddingTop: 34, paddingHorizontal: 4 },
});
