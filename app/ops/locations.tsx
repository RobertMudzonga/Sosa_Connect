import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { CoordinateField } from '@/src/components/map/CoordinateField';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useTowns } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Admin: towns Kuwana serves, with their zones and suburbs */
export default function LocationsScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data, isLoading } = useTowns();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', province: '', lat: '', lng: '', metro: false, cod: false });
  const create = useOpsAction(() => controlApi.createTown({
    name: form.name.trim(), province: form.province.trim(), zone: form.metro ? 'METRO' : 'INTERCITY', codEligible: form.cod,
    ...(form.lat && form.lng ? { lat: Number(form.lat), lng: Number(form.lng) } : {}),
  }));
  const add = () => create.mutateAsync(undefined)
    .then((town) => { setAdding(false); setForm({ name: '', province: '', lat: '', lng: '', metro: false, cod: false }); router.push({ pathname: '/ops/location', params: { id: town.id } }); })
    .catch((e) => notify('Could not add town', getErrorMessage(e)));

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Suburbs in a zone are priced from that town’s zone matrix; suburbs without a zone use the distance bands in Delivery fees.
      </Typography>
      {(data ?? []).map((c) => (
        <TouchableOpacity key={c.id} onPress={() => router.push({ pathname: '/ops/location', params: { id: c.id } })} style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}>
          <MapPin size={18} color={c.isActive ? t.accent : t.textSecondary} />
          <View style={styles.flex}>
            <Typography variant="body" weight="semibold" color={c.isActive ? t.text : t.textSecondary}>{c.name}</Typography>
            <Typography variant="caption" color={t.textSecondary}>
              {c.province} · {plural(c.suburbs.length, 'suburb')} · {plural(c.zones.length, 'zone')} · {plural(c.branchCount, 'branch', 'branches')} · {plural(c.pickupPointCount, 'pickup point')}
            </Typography>
          </View>
          {!c.isActive && <Pill label="Hidden" tone="bad" />}
          {c.isActive && c.zones.length > 0 && c.unzonedSuburbs > 0 && <Pill label={`${c.unzonedSuburbs} unzoned`} tone="warn" />}
          <ChevronRight size={16} color={t.textSecondary} />
        </TouchableOpacity>
      ))}

      {adding ? (
        <Panel title="New town">
          <Field label="Name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="e.g. Norton" />
          <Field label="Province" value={form.province} onChangeText={(province) => setForm((f) => ({ ...f, province }))} placeholder="e.g. Mashonaland West" />
          <CoordinateField
            label="Town centre"
            value={form.lat && form.lng ? { lat: Number(form.lat), lng: Number(form.lng) } : null}
            onChange={(p) => setForm((f) => ({ ...f, lat: p ? String(p.lat) : '', lng: p ? String(p.lng) : '' }))}
            hint="Used for distance when a buyer picks the town without a suburb or GPS"
            optional
          />
          <View style={styles.toggle}><Typography variant="bodySm" style={styles.flex}>Metro (Harare / Bulawayo-style courier zone)</Typography><Switch value={form.metro} onValueChange={(metro) => setForm((f) => ({ ...f, metro }))} /></View>
          <View style={styles.toggle}><Typography variant="bodySm" style={styles.flex}>Cash on delivery allowed</Typography><Switch value={form.cod} onValueChange={(cod) => setForm((f) => ({ ...f, cod }))} /></View>
          <View style={styles.pair}>
            <Button label="Cancel" variant="ghost" onPress={() => setAdding(false)} style={styles.flex} />
            <Button label="Add town" onPress={add} loading={create.isPending} disabled={form.name.trim().length < 2 || form.province.trim().length < 2} style={styles.flex} />
          </View>
        </Panel>
      ) : (
        <Button label="Add a town" variant="outline" onPress={() => setAdding(true)} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
