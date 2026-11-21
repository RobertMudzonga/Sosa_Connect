import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs } from '@/src/components/merchant/ui';
import { CoordinateField } from '@/src/components/map/CoordinateField';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useTowns, SuburbRow, ZoneRow } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const fail = (title: string) => (e: unknown) => notify(title, getErrorMessage(e));

function SuburbLine({ s, zones, centre }: { s: SuburbRow; zones: ZoneRow[]; centre: { lat: number; lng: number } | null }) {
  const t = useMarketTheme();
  const update = useOpsAction((body: Partial<SuburbRow>) => controlApi.updateSuburb(s.id, body));
  const set = (body: Partial<SuburbRow>) => update.mutateAsync(body).catch(fail('Could not update suburb'));
  const chip = (id: string | null, label: string) => {
    const on = s.zoneId === id;
    return (
      <TouchableOpacity key={id ?? 'none'} onPress={() => !on && set({ zoneId: id })} disabled={update.isPending}
        style={[styles.chip, { backgroundColor: on ? t.primary : t.surfaceVariant }]} accessibilityLabel={`${s.name}: ${label}`}>
        <Typography variant="caption" weight="semibold" style={{ color: on ? '#fff' : t.text }}>{label}</Typography>
      </TouchableOpacity>
    );
  };
  return (
    <View style={[styles.suburb, { borderColor: t.border }]}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Typography variant="bodySm" weight="semibold" color={s.isActive ? t.text : t.textSecondary}>{s.name}</Typography>
          <CoordinateField
            variant="link"
            label={`${s.name} centre`}
            value={s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null}
            onChange={(p) => { void set({ lat: p?.lat ?? null, lng: p?.lng ?? null }); }}
            centre={centre}
            suffix={s.branchCount ? ` · ${s.branchCount} branch${s.branchCount === 1 ? '' : 'es'}` : ''}
          />
        </View>
        <Switch value={s.isActive} onValueChange={(isActive) => { void set({ isActive }); }} disabled={update.isPending} accessibilityLabel={`${s.name} visible to buyers`} />
      </View>
      {zones.length > 0 && <View style={styles.chips}>{zones.map((z) => chip(z.id, z.code))}{chip(null, 'No zone')}</View>}
    </View>
  );
}

/** Admin: one town's flags, pricing zones and suburbs */
export default function LocationScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useTowns();
  const town = data?.find((c) => c.id === id);
  const [filter, setFilter] = useState<'ALL' | 'UNZONED'>('ALL');
  const [zone, setZone] = useState({ code: '', name: '' });
  const [sub, setSub] = useState({ name: '', lat: '', lng: '' });

  const updateTown = useOpsAction((body: Record<string, unknown>) => controlApi.updateTown(id!, body));
  const addZone = useOpsAction(() => controlApi.createZone(id!, { code: zone.code.trim(), name: zone.name.trim(), sortOrder: town?.zones.length ?? 0 }));
  const delZone = useOpsAction((zoneId: string) => controlApi.deleteZone(zoneId));
  const addSuburb = useOpsAction(() => controlApi.createSuburb(id!, { name: sub.name.trim(), ...(sub.lat && sub.lng ? { lat: Number(sub.lat), lng: Number(sub.lng) } : {}) }));

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  if (!town) return <View style={styles.center}><Typography color={t.textSecondary}>Town not found</Typography></View>;
  const centre = town.lat != null && town.lng != null ? { lat: town.lat, lng: town.lng } : null;
  const suburbs = filter === 'UNZONED' ? town.suburbs.filter((s) => !s.zoneId) : town.suburbs;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: town.name }} />
      <Panel title="Town" right={<Pill label={town.isActive ? 'Live' : 'Hidden'} tone={town.isActive ? 'good' : 'bad'} />}>
        {([
          ['isActive', 'Buyers can choose this town', town.isActive],
          ['codEligible', 'Cash on delivery allowed', town.codEligible],
        ] as const).map(([key, label, value]) => (
          <View key={key} style={styles.rowBetween}>
            <Typography variant="bodySm" style={styles.flex}>{label}</Typography>
            <Switch value={value} disabled={updateTown.isPending} onValueChange={(v) => { updateTown.mutateAsync({ [key]: v }).catch(fail('Could not update town')); }} />
          </View>
        ))}
        <Typography variant="caption" color={t.textSecondary}>{town.province} · {town.zone === 'METRO' ? 'Metro' : 'Intercity'}</Typography>
        <CoordinateField label="Town centre" value={centre} onChange={(p) => { if (p) updateTown.mutateAsync({ lat: p.lat, lng: p.lng }).catch(fail('Could not update town')); }} />
      </Panel>

      <Panel title="Pricing zones">
        {town.zones.length === 0 && <Typography variant="bodySm" color={t.textSecondary}>No zones yet: every run here is priced by distance band.</Typography>}
        {town.zones.map((z) => (
          <View key={z.id} style={styles.rowBetween}>
            <View style={styles.flex}>
              <Typography variant="bodySm" weight="semibold">{z.name}</Typography>
              <Typography variant="caption" color={t.textSecondary}>{z.code} · {z.suburbCount} suburbs</Typography>
            </View>
            <TouchableOpacity accessibilityLabel={`Delete ${z.name}`} onPress={async () => {
              if (await confirmAction(`Delete ${z.name}?`, 'Its suburbs go back to distance-band pricing and its prices are removed.', 'Delete', true)) delZone.mutateAsync(z.id).catch(fail('Could not delete zone'));
            }}>
              <Trash2 size={16} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.pair}>
          <View style={styles.flex}><Field label="Code" value={zone.code} onChangeText={(code) => setZone((z) => ({ ...z, code: code.toUpperCase() }))} placeholder="ZONE_1_INNER" autoCapitalize="characters" /></View>
          <View style={styles.flex}><Field label="Name" value={zone.name} onChangeText={(name) => setZone((z) => ({ ...z, name }))} placeholder="Zone 1 · Inner" /></View>
        </View>
        <Button label="Add zone" variant="ghost" size="sm" loading={addZone.isPending} disabled={zone.code.length < 2 || zone.name.trim().length < 2}
          onPress={() => addZone.mutateAsync(undefined).then(() => setZone({ code: '', name: '' })).catch(fail('Could not add zone'))} />
        {town.zones.length > 0 && <Button label="Edit zone prices" onPress={() => router.push({ pathname: '/ops/zone-pricing', params: { cityId: town.id } })} />}
      </Panel>

      <Panel title={`Suburbs (${town.suburbs.length})`} right={town.unzonedSuburbs ? <Pill label={`${town.unzonedSuburbs} unzoned`} tone="warn" /> : undefined}>
        <Tabs value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'All' }, { value: 'UNZONED', label: 'Without a zone' }]} />
        {suburbs.map((s) => <SuburbLine key={s.id} s={s} zones={town.zones} centre={centre} />)}
        <Typography variant="caption" weight="semibold">Add a suburb</Typography>
        <Field label="Name" value={sub.name} onChangeText={(name) => setSub((x) => ({ ...x, name }))} placeholder="e.g. Mabelreign" />
        <CoordinateField
          label="Suburb centre"
          value={sub.lat && sub.lng ? { lat: Number(sub.lat), lng: Number(sub.lng) } : null}
          onChange={(p) => setSub((x) => ({ ...x, lat: p ? String(p.lat) : '', lng: p ? String(p.lng) : '' }))}
          centre={centre}
          hint="Used for distance when a buyer picks the suburb without sharing GPS"
          optional
        />
        <Button label="Add suburb" variant="outline" size="sm" loading={addSuburb.isPending} disabled={sub.name.trim().length < 2}
          onPress={() => addSuburb.mutateAsync(undefined).then(() => setSub({ name: '', lat: '', lng: '' })).catch(fail('Could not add suburb'))} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.sm },
  suburb: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
});
