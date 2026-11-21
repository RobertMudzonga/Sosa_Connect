import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel } from '@/src/components/merchant/ui';
import { CoordinateField } from '@/src/components/map/CoordinateField';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCities } from '@/src/hooks/useCatalog';
import { useCreateBranch, useMyBranch, useUpdateBranch, OperatingHours } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
const every = (open: string, close: string): OperatingHours =>
  Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, [[open, close]]]));

/** Common Zimbabwean trading patterns; a per-day editor can come later */
const HOURS_PRESETS: { value: string; label: string; hours: OperatingHours }[] = [
  { value: 'retail', label: 'Mon–Fri 8–5:30, Sat 8–1', hours: { ...Object.fromEntries(WEEKDAYS.map((d) => [d, [['08:00', '17:30']]])), sat: [['08:00', '13:00']], sun: [] } },
  { value: 'daily7', label: 'Every day 7am–7pm', hours: every('07:00', '19:00') },
  { value: 'daily6', label: 'Every day 6am–9pm', hours: every('06:00', '21:00') },
  { value: 'always', label: 'Open 24 hours', hours: every('00:00', '24:00') },
];

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
/** Missing days and empty days both mean closed */
const normalise = (h: OperatingHours) => JSON.stringify(ALL_DAYS.map((d) => h[d] ?? []));

function presetFor(hours: OperatingHours): string | null {
  return HOURS_PRESETS.find((p) => normalise(p.hours) === normalise(hours))?.value ?? null;
}

/** Add or edit a store branch: where it is (GPS pin for drivers), when it is open, how long packing takes */
export default function BranchForm() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing, isLoading } = useMyBranch(id);
  const { data: cities } = useCities();
  const create = useCreateBranch();
  const update = useUpdateBranch();

  const [name, setName] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [suburbId, setSuburbId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [preset, setPreset] = useState<string>('retail');
  const [customHours, setCustomHours] = useState<OperatingHours | null>(null);
  const [prep, setPrep] = useState('30');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCityId(existing.city.id);
    setSuburbId(existing.suburb?.id ?? null);
    setAddress(existing.address);
    setLandmark(existing.landmark ?? '');
    setPhone(existing.phone ?? '');
    setLat(String(existing.lat));
    setLng(String(existing.lng));
    setPrep(String(existing.defaultPrepTimeMins));
    const p = presetFor(existing.operatingHours);
    if (p) setPreset(p);
    else {
      setPreset('custom');
      setCustomHours(existing.operatingHours);
    }
  }, [existing]);

  const city = useMemo(() => cities?.find((c) => c.id === cityId), [cities, cityId]);

  const latN = Number(lat);
  const lngN = Number(lng);
  const pinValue = lat && lng && Number.isFinite(latN) && Number.isFinite(lngN) ? { lat: latN, lng: lngN } : null;
  const missing = !name.trim() ? 'Name the branch'
    : !cityId ? 'Choose the town'
    : address.trim().length < 3 ? 'Enter the street address'
    : !lat || !lng || !Number.isFinite(latN) || !Number.isFinite(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180 ? 'Drop the map pin so drivers can find you'
    : null;

  const save = async () => {
    const hours = preset === 'custom' ? customHours ?? undefined : HOURS_PRESETS.find((p) => p.value === preset)!.hours;
    const body = {
      name: name.trim(),
      cityId: cityId!,
      suburbId: suburbId ?? (existing ? null : undefined),
      address: address.trim(),
      landmark: landmark.trim() || (existing ? null : undefined),
      phone: phone.trim() || (existing ? null : undefined),
      lat: latN,
      lng: lngN,
      operatingHours: hours,
      defaultPrepTimeMins: Math.max(5, Math.round(Number(prep) || 30)),
    };
    try {
      if (existing) await update.mutateAsync({ id: existing.id, ...body });
      else await create.mutateAsync(body);
      router.back();
    } catch (e) {
      notify('Could not save the branch', getErrorMessage(e));
    }
  };

  const close = async () => {
    if (!existing) return;
    try {
      await update.mutateAsync({ id: existing.id, isActive: !existing.isActive });
      router.back();
    } catch (e) {
      notify('Could not update the branch', getErrorMessage(e));
    }
  };

  if (id && isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Panel title="Branch">
        <Field label="Branch name" value={name} onChangeText={setName} placeholder="e.g. Avondale" />
        <OptionPicker label="Town" placeholder="Choose a town" value={cityId}
          options={(cities ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.province }))}
          onChange={(v) => { setCityId(v); setSuburbId(null); }} />
        {!!city?.suburbs.length && (
          <OptionPicker label="Suburb" placeholder="Choose a suburb" value={suburbId}
            options={city.suburbs.map((s) => ({ value: s.id, label: s.name }))} onChange={setSuburbId} />
        )}
        <Field label="Street address" value={address} onChangeText={setAddress} placeholder="Shop number, building, street" />
        <Field label="Landmark (helps drivers)" value={landmark} onChangeText={setLandmark} placeholder="e.g. Next to OK Mart, blue roof" />
        <Field label="Branch phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+263 77 123 4567" />
      </Panel>

      <Panel title="Map pin">
        <CoordinateField
          label="Shop entrance"
          value={pinValue}
          onChange={(p) => { setLat(p ? String(p.lat) : ''); setLng(p ? String(p.lng) : ''); }}
          centre={city?.lat != null && city.lng != null ? { lat: city.lat, lng: city.lng } : null}
          hint="Drivers navigate to this pin. Zoom in and drop it on the door."
        />
      </Panel>

      <Panel title="Opening hours">
        <OptionPicker
          label="Trading hours"
          placeholder="Choose hours"
          value={preset}
          searchable={false}
          options={[...HOURS_PRESETS.map((p) => ({ value: p.value, label: p.label })), ...(customHours ? [{ value: 'custom', label: 'Keep current custom hours' }] : [])]}
          onChange={(v) => v && setPreset(v)}
        />
        <Typography variant="caption" color={t.textSecondary}>
          Orders placed while you are closed are packed when you open; open branches are shown to buyers first.
        </Typography>
        <Field label="Minutes to pack an order" value={prep} onChangeText={setPrep} keyboardType="number-pad" />
      </Panel>

      {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
      <Button label={existing ? 'Save changes' : 'Add branch'} size="lg" onPress={save} loading={create.isPending || update.isPending} disabled={!!missing} />
      {existing && (
        <Button
          label={existing.isActive ? 'Close this branch' : 'Reopen this branch'}
          variant="outline"
          onPress={close}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.sm },
  gps: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
