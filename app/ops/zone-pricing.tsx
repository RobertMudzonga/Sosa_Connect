import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Tabs } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useTowns, useZoneMatrix, ZoneRule } from '@/src/hooks/useControl';
import type { VehicleClass } from '@/src/hooks/useCatalog';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

type Cell = { customer: string; driver: string; customerKm: string; driverKm: string };
const EMPTY: Cell = { customer: '', driver: '', customerKm: '', driverKm: '' };
const VEHICLES: { value: VehicleClass; label: string }[] = [{ value: 'BIKE', label: 'Motorbike' }, { value: 'CAR', label: 'Car' }, { value: 'BAKKIE', label: 'Bakkie' }];
const key = (o: string, d: string, v: string) => `${o}:${d}:${v}`;
const str = (n: number) => (n ? String(n) : '');

/** Admin: delivery price between each pair of zones in a town, per vehicle */
export default function ZonePricingScreen() {
  const t = useMarketTheme();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { data: towns } = useTowns();
  const { data, isLoading } = useZoneMatrix(cityId);
  const [vehicle, setVehicle] = useState<VehicleClass>('BIKE');
  const [form, setForm] = useState<Record<string, Cell>>({});

  useEffect(() => {
    if (!data) return;
    setForm(Object.fromEntries(data.rules.map((r) => [key(r.originZoneId, r.destinationZoneId, r.vehicleClass), {
      customer: String(r.customerFeeUsd), driver: String(r.driverPayoutUsd), customerKm: str(r.customerPerKmUsd), driverKm: str(r.driverPerKmUsd),
    }])));
  }, [data]);

  // Each unordered pair once (A→B also prices B→A); a reverse-direction rule from the API is shown on its own row
  const pairs = useMemo(() => {
    const zones = data?.zones ?? [];
    const list: [string, string][] = [];
    zones.forEach((a, i) => zones.slice(i).forEach((b) => list.push([a.id, b.id])));
    for (const r of data?.rules ?? []) {
      if (!list.some(([a, b]) => a === r.originZoneId && b === r.destinationZoneId)) list.push([r.originZoneId, r.destinationZoneId]);
    }
    return list;
  }, [data]);
  const name = (id: string) => data?.zones.find((z) => z.id === id)?.name ?? '?';

  const rules = (): ZoneRule[] => Object.entries(form).flatMap(([k, c]) => {
    if (!c.customer.trim() && !c.driver.trim()) return [];
    const [originZoneId, destinationZoneId, vehicleClass] = k.split(':');
    return [{
      originZoneId, destinationZoneId, vehicleClass: vehicleClass as VehicleClass,
      customerFeeUsd: Number(c.customer), driverPayoutUsd: Number(c.driver), customerPerKmUsd: Number(c.customerKm || 0), driverPerKmUsd: Number(c.driverKm || 0),
    }];
  });
  const save = useOpsAction(() => controlApi.saveMatrix(cityId!, rules()));
  const set = (k: string, f: keyof Cell, v: string) => setForm((s) => ({ ...s, [k]: { ...(s[k] ?? EMPTY), [f]: v } }));

  if (isLoading || !data) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  const town = towns?.find((c) => c.id === cityId);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: `${town?.name ?? 'Zone'} prices` }} />
      <Typography variant="bodySm" color={t.textSecondary}>
        Fee = base + per-km × straight-line km from the store. Leave a pair blank to price it by distance band instead. Pickup-point drops still get the pickup discount.
      </Typography>
      <Tabs value={vehicle} onChange={setVehicle} options={VEHICLES} />
      {pairs.map(([o, d]) => {
        const k = key(o, d, vehicle);
        const c = form[k] ?? EMPTY;
        const margin = Number(c.customer) - Number(c.driver);
        return (
          <Panel key={k} title={o === d ? `Within ${name(o)}` : `${name(o)} ↔ ${name(d)}`}>
            <View style={styles.grid}>
              <View style={styles.cell}><Field label="Buyer pays $" value={c.customer} onChangeText={(v) => set(k, 'customer', v)} keyboardType="decimal-pad" placeholder="band" /></View>
              <View style={styles.cell}><Field label="Driver gets $" value={c.driver} onChangeText={(v) => set(k, 'driver', v)} keyboardType="decimal-pad" placeholder="band" /></View>
              <View style={styles.cell}><Field label="+ $/km buyer" value={c.customerKm} onChangeText={(v) => set(k, 'customerKm', v)} keyboardType="decimal-pad" placeholder="0" /></View>
              <View style={styles.cell}><Field label="+ $/km driver" value={c.driverKm} onChangeText={(v) => set(k, 'driverKm', v)} keyboardType="decimal-pad" placeholder="0" /></View>
            </View>
            {c.customer.trim() !== '' && Number.isFinite(margin) && (
              <Typography variant="caption" color={margin < 0 ? t.error : t.textSecondary}>
                {margin < 0 ? 'Driver pay is above the buyer fee' : `Kuwana keeps $${margin.toFixed(2)} base`}
              </Typography>
            )}
          </Panel>
        );
      })}
      <Button label="Save zone prices" size="lg" loading={save.isPending}
        onPress={() => save.mutateAsync(undefined).then(() => notify('Saved', 'New prices apply to new quotes and orders.')).catch((e) => notify('Could not save', getErrorMessage(e)))} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
