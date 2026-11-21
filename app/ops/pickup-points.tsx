import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { CoordinateField } from '@/src/components/map/CoordinateField';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, usePickupAdmin, useTowns, PickupPointRow, PickupType } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const TYPES: { value: PickupType; label: string }[] = [
  { value: 'PARTNER_SHOP', label: 'Shop' }, { value: 'MALL', label: 'Mall' }, { value: 'BUS_DEPOT', label: 'Bus depot' }, { value: 'COURIER_DEPOT', label: 'Depot' },
];

type Form = {
  code: string; name: string; type: PickupType; cityId: string; suburbId: string | null; address: string; landmark: string;
  lat: string; lng: string; phone: string; operatingHours: string; agentFeeUsd: string; maxDailyParcels: string; isActive: boolean;
};
const blank: Form = { code: '', name: '', type: 'PARTNER_SHOP', cityId: '', suburbId: null, address: '', landmark: '', lat: '', lng: '', phone: '', operatingHours: 'Mon–Sat 08:00–18:00', agentFeeUsd: '0.50', maxDailyParcels: '', isActive: true };
const toForm = (p: PickupPointRow): Form => ({
  code: p.code, name: p.name, type: p.type, cityId: p.city.id, suburbId: p.suburb?.id ?? null, address: p.address, landmark: p.landmark ?? '',
  lat: p.lat != null ? String(p.lat) : '', lng: p.lng != null ? String(p.lng) : '', phone: p.phone ?? '', operatingHours: p.operatingHours ?? '',
  agentFeeUsd: String(p.agentFeeUsd), maxDailyParcels: p.maxDailyParcels ? String(p.maxDailyParcels) : '', isActive: p.isActive,
});

function Editor({ point, onDone }: { point: PickupPointRow | null; onDone: () => void }) {
  const t = useMarketTheme();
  const { data: towns } = useTowns();
  const [f, setF] = useState<Form>(point ? toForm(point) : blank);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const town = towns?.find((c) => c.id === f.cityId);
  const save = useOpsAction(() => controlApi.savePickup(point?.id ?? null, {
    code: f.code.trim(), name: f.name.trim(), type: f.type, cityId: f.cityId, suburbId: f.suburbId, address: f.address.trim(),
    landmark: f.landmark.trim() || null, lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null, phone: f.phone.trim() || null,
    operatingHours: f.operatingHours.trim() || null, agentFeeUsd: Number(f.agentFeeUsd || 0), maxDailyParcels: f.maxDailyParcels ? Number(f.maxDailyParcels) : null, isActive: f.isActive,
  }));
  const missing = !f.code || !f.name.trim() || !f.cityId || f.address.trim().length < 3;

  return (
    <Panel title={point ? `Edit ${point.name}` : 'New pickup point'}>
      <View style={styles.pair}>
        <View style={styles.flex}><Field label="Code" value={f.code} onChangeText={(v) => set('code', v.toUpperCase())} autoCapitalize="characters" placeholder="PP-HRE-AVD" /></View>
        <View style={styles.flex2}><Field label="Name" value={f.name} onChangeText={(v) => set('name', v)} placeholder="Avondale Tuckshop" /></View>
      </View>
      <Tabs value={f.type} onChange={(v) => set('type', v)} options={TYPES} />
      <Typography variant="caption" weight="semibold">Town</Typography>
      <View style={styles.chips}>
        {(towns ?? []).filter((c) => c.isActive).map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setF((x) => ({ ...x, cityId: c.id, suburbId: null }))} style={[styles.chip, { backgroundColor: f.cityId === c.id ? t.primary : t.surfaceVariant }]}>
            <Typography variant="caption" weight="semibold" style={{ color: f.cityId === c.id ? '#fff' : t.text }}>{c.name}</Typography>
          </TouchableOpacity>
        ))}
      </View>
      {!!town?.suburbs.length && (
        <>
          <Typography variant="caption" weight="semibold">Suburb</Typography>
          <View style={styles.chips}>
            {town.suburbs.filter((s) => s.isActive).map((s) => (
              <TouchableOpacity key={s.id} onPress={() => set('suburbId', s.id)} style={[styles.chip, { backgroundColor: f.suburbId === s.id ? t.primary : t.surfaceVariant }]}>
                <Typography variant="caption" weight="semibold" style={{ color: f.suburbId === s.id ? '#fff' : t.text }}>{s.name}</Typography>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <Field label="Address" value={f.address} onChangeText={(v) => set('address', v)} />
      <Field label="Landmark" value={f.landmark} onChangeText={(v) => set('landmark', v)} placeholder="Next to the Total garage" />
      <CoordinateField
        label="Counter location"
        value={f.lat && f.lng ? { lat: Number(f.lat), lng: Number(f.lng) } : null}
        onChange={(pt) => setF((x) => ({ ...x, lat: pt ? String(pt.lat) : '', lng: pt ? String(pt.lng) : '' }))}
        centre={(() => {
          const sub = town?.suburbs.find((s) => s.id === f.suburbId);
          if (sub?.lat != null && sub.lng != null) return { lat: sub.lat, lng: sub.lng };
          return town?.lat != null && town.lng != null ? { lat: town.lat, lng: town.lng } : null;
        })()}
        hint="Drivers and buyers navigate here; checkout sorts points by distance from it"
        optional
      />
      <View style={styles.pair}>
        <View style={styles.flex}><Field label="Phone" value={f.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" placeholder="+263…" /></View>
        <View style={styles.flex}><Field label="Opening hours" value={f.operatingHours} onChangeText={(v) => set('operatingHours', v)} /></View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}><Field label="Agent fee per parcel ($)" value={f.agentFeeUsd} onChangeText={(v) => set('agentFeeUsd', v)} keyboardType="decimal-pad" /></View>
        <View style={styles.flex}><Field label="Max parcels a day" value={f.maxDailyParcels} onChangeText={(v) => set('maxDailyParcels', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="No limit" /></View>
      </View>
      <View style={styles.rowBetween}><Typography variant="bodySm" style={styles.flex}>Open to buyers</Typography><Switch value={f.isActive} onValueChange={(v) => set('isActive', v)} /></View>
      <View style={styles.pair}>
        <Button label="Cancel" variant="ghost" onPress={onDone} style={styles.flex} />
        <Button label="Save" disabled={missing} loading={save.isPending} style={styles.flex}
          onPress={() => save.mutateAsync(undefined).then(onDone).catch((e) => notify('Could not save', getErrorMessage(e)))} />
      </View>
    </Panel>
  );
}

/** Admin: partner collection points, their capacity and what Kuwana owes each agent */
export default function PickupPointsScreen() {
  const t = useMarketTheme();
  const { data, isLoading } = usePickupAdmin();
  const [editing, setEditing] = useState<string | 'NEW' | null>(null);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.accent} /></View>;
  const owed = (data ?? []).reduce((s, p) => s + p.agentFeesThisMonthUsd, 0);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Agent fees this month: {usd(owed)} across {(data ?? []).reduce((s, p) => s + p.collectedThisMonth, 0)} parcels handed out. A point at its daily limit disappears from checkout until tomorrow.
      </Typography>
      {editing === 'NEW' ? <Editor point={null} onDone={() => setEditing(null)} /> : <Button label="Add a pickup point" variant="outline" onPress={() => setEditing('NEW')} />}
      {(data ?? []).map((p) => editing === p.id ? <Editor key={p.id} point={p} onDone={() => setEditing(null)} /> : (
        <TouchableOpacity key={p.id} onPress={() => setEditing(p.id)} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Typography variant="body" weight="semibold" color={p.isActive ? t.text : t.textSecondary}>{p.name}</Typography>
              <Typography variant="caption" color={t.textSecondary}>{p.code} · {p.suburb?.name ? `${p.suburb.name}, ` : ''}{p.city.name}</Typography>
            </View>
            {!p.isActive ? <Pill label="Closed" tone="bad" />
              : p.maxDailyParcels && p.bookedToday >= p.maxDailyParcels ? <Pill label="Full today" tone="warn" />
              : <Pill label={p.maxDailyParcels ? `${p.bookedToday}/${p.maxDailyParcels} today` : `${p.bookedToday} today`} tone="info" />}
          </View>
          <Typography variant="caption" color={t.textSecondary}>
            {usd(p.agentFeeUsd)} per parcel · {p.collectedThisMonth} handed out this month ({usd(p.agentFeesThisMonthUsd)}) · {p.operatingHours ?? 'hours not set'}
          </Typography>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: 4 },
});
