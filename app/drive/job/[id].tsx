import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Store, MapPin, Phone, Navigation, Banknote, CheckCircle2, Undo2 } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useDriverJob, useJobAction } from '@/src/hooks/useDriver';
import { getErrorMessage, formatPrice } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const FAIL_REASONS = [
  { value: 'NOT_HOME', label: 'Nobody there' },
  { value: 'REFUSED', label: 'Refused' },
  { value: 'WRONG_ADDRESS', label: 'Can’t find it' },
  { value: 'OTHER', label: 'Other' },
] as const;

const directions = (lat?: number | null, lng?: number | null) => {
  if (lat == null || lng == null) return;
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
};

function Contact({ phone, label }: { phone?: string | null; label: string }) {
  const t = useMarketTheme();
  if (!phone) return null;
  return (
    <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.inline} accessibilityLabel={`Call ${label}`}>
      <Phone size={14} color={t.accent} />
      <Typography variant="bodySm" weight="semibold" color={t.accent}>Call {label}</Typography>
    </TouchableOpacity>
  );
}

/** One delivery: store PIN at pickup, customer PIN (and cash) at drop-off */
export default function DriverJobScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: j, isLoading, error } = useDriverJob(id);
  const act = useJobAction();
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [cash, setCash] = useState('');
  const [failing, setFailing] = useState<string | null>(null);

  if (isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  if (!j) return <View style={[styles.center, { backgroundColor: t.background }]}><Typography color={t.textSecondary}>{getErrorMessage(error, 'Job not found')}</Typography></View>;

  const run = async (action: 'claim' | 'release' | 'pickup' | 'deliver' | 'fail', body?: Record<string, unknown>, done?: string) => {
    try {
      await act.mutateAsync({ id: j.id, action, body });
      if (done) notify(done, '');
      if (action === 'release') router.back();
    } catch (e) {
      notify('Not done', getErrorMessage(e));
    }
  };

  const cod = j.cashOnDelivery?.collect;
  const toPoint = j.dropoff.type === 'PICKUP_POINT';

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Panel title={j.reference} right={<Pill label={j.status.replace(/_/g, ' ').toLowerCase()} tone={j.status === 'DELIVERED' ? 'good' : j.status === 'RETURNING' ? 'warn' : 'info'} />}>
        <Typography variant="h3" weight="bold" color={t.success}>You earn {usd(j.earningsUsd)}</Typography>
        <Typography variant="caption" color={t.textSecondary}>{j.tripKm.toFixed(1)} km · {usd(j.collateralUsd)} of float locked until it’s delivered or back at the store</Typography>
        <Typography variant="bodySm">{j.parcel.items.join(' · ')}</Typography>
        {!!j.parcel.notes && <Typography variant="caption" color={t.textSecondary}>Customer note: {j.parcel.notes}</Typography>}
      </Panel>

      {/* 1. Store */}
      <Panel title="Collect from">
        <View style={styles.inline}><Store size={15} color={t.textSecondary} /><Typography variant="bodySm" weight="bold" style={styles.flex}>{j.store.name}</Typography></View>
        <Typography variant="bodySm">{j.store.address}{j.store.suburb ? `, ${j.store.suburb}` : ''}</Typography>
        {!!j.store.landmark && <Typography variant="caption" color={t.textSecondary}>{j.store.landmark}</Typography>}
        <View style={styles.links}>
          <TouchableOpacity onPress={() => directions(j.store.lat, j.store.lng)} style={styles.inline}>
            <Navigation size={14} color={t.accent} /><Typography variant="bodySm" weight="semibold" color={t.accent}>Directions</Typography>
          </TouchableOpacity>
          <Contact phone={j.store.phone} label="store" />
        </View>
        {j.status === 'CLAIMED' && (
          <View style={styles.gap}>
            <Typography variant="caption" color={t.textSecondary}>Show your ID at the counter. The staff will read you a 4-digit PIN.</Typography>
            <Field label="Store PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="••••" />
            <Button label="I have the parcel" onPress={() => run('pickup', { pin })} loading={act.isPending} disabled={pin.length !== 4} />
            <Button label="Hand this job back" variant="ghost" size="sm"
              onPress={async () => { if (await confirmAction('Hand back this job?', 'Your float is unlocked and another driver can take it.', 'Hand back', true)) run('release'); }} />
          </View>
        )}
        {j.status === 'OPEN' && <Button label="Take this job" onPress={() => run('claim')} loading={act.isPending} />}
      </Panel>

      {/* 2. Drop-off (full details only once the job is yours) */}
      <Panel title={toPoint ? 'Drop at pickup point' : 'Deliver to'}>
        <View style={styles.inline}><MapPin size={15} color={t.textSecondary} />
          <Typography variant="bodySm" weight="bold" style={styles.flex}>{toPoint ? j.dropoff.name ?? j.dropoff.area : j.dropoff.recipientName ?? j.dropoff.area}</Typography>
        </View>
        {!!j.dropoff.address && <Typography variant="bodySm">{j.dropoff.address}</Typography>}
        <Typography variant="caption" color={t.textSecondary}>{j.dropoff.area}</Typography>
        {!!j.dropoff.landmark && <Typography variant="caption" color={t.textSecondary}>Landmark: {j.dropoff.landmark}</Typography>}
        {!!j.dropoff.instructions && <Typography variant="caption" color={t.textSecondary}>{j.dropoff.instructions}</Typography>}
        {j.status !== 'OPEN' && (
          <View style={styles.links}>
            <TouchableOpacity onPress={() => directions(j.dropoff.lat, j.dropoff.lng)} style={styles.inline}>
              <Navigation size={14} color={t.accent} /><Typography variant="bodySm" weight="semibold" color={t.accent}>Directions</Typography>
            </TouchableOpacity>
            {!toPoint && <Contact phone={j.dropoff.recipientPhone} label="customer" />}
          </View>
        )}

        {j.status === 'IN_TRANSIT' && toPoint && (
          <View style={styles.gap}>
            <Typography variant="caption" color={t.textSecondary}>Hand the parcel to the counter; they keep it until the customer collects with their PIN.</Typography>
            <Button label="Dropped at the pickup point" onPress={() => run('deliver', {}, 'Delivered')} loading={act.isPending} />
          </View>
        )}
        {j.status === 'IN_TRANSIT' && !toPoint && (
          <View style={styles.gap}>
            {cod && (
              <View style={[styles.cash, { backgroundColor: t.surfaceVariant }]}>
                <View style={styles.inline}><Banknote size={16} color={t.warning} /><Typography variant="bodySm" weight="bold">Collect {formatPrice({ usd: cod.amount, zwg: cod.amount }, cod.currency)} in cash</Typography></View>
                <Typography variant="caption" color={t.textSecondary}>You keep the cash; the same amount is taken from your float.</Typography>
                <Field label={`Cash received (${cod.currency === 'USD' ? 'USD' : 'ZiG'})`} value={cash} onChangeText={setCash} keyboardType="decimal-pad" placeholder={String(cod.amount)} />
              </View>
            )}
            <Typography variant="caption" color={t.textSecondary}>Ask for the 6-digit PIN we texted the customer. Only hand over once you have it.</Typography>
            <Field label="Customer PIN" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="••••••" />
            <Button label="Delivered" onPress={() => run('deliver', { otp, ...(cod ? { cashCollected: Number(cash) } : {}) }, 'Delivered. Fee added to your earnings.')}
              loading={act.isPending} disabled={otp.length !== 6 || (!!cod && !(Number(cash) >= 0 && cash.trim() !== ''))} />
          </View>
        )}
      </Panel>

      {j.status === 'IN_TRANSIT' && (
        <Panel title="Can’t deliver?">
          <View style={styles.chips}>
            {FAIL_REASONS.map((r) => (
              <TouchableOpacity key={r.value} onPress={() => setFailing(r.value)} style={[styles.chip, { backgroundColor: failing === r.value ? t.primary : t.surfaceVariant }]}>
                <Typography variant="caption" weight="semibold" style={{ color: failing === r.value ? '#fff' : t.text }}>{r.label}</Typography>
              </TouchableOpacity>
            ))}
          </View>
          {failing && (
            <Button label="Take it back to the store" variant="outline" onPress={() => run('fail', { reason: failing }, 'Take the parcel back to the store')} loading={act.isPending} />
          )}
          <Typography variant="caption" color={t.textSecondary}>Try calling the customer first. You’re still paid for the trip once the store has it back.</Typography>
        </Panel>
      )}

      {j.status === 'RETURNING' && (
        <Panel title="Return to the store">
          <View style={styles.inline}><Undo2 size={15} color={t.warning} /><Typography variant="bodySm" style={styles.flex}>Bring the parcel back to {j.store.name}. Staff confirm it in their app; then your float is unlocked and the trip is paid.</Typography></View>
        </Panel>
      )}
      {(j.status === 'DELIVERED' || j.status === 'RETURNED_TO_STORE') && (
        <Panel>
          <View style={styles.inline}><CheckCircle2 size={18} color={t.success} /><Typography variant="bodySm" weight="semibold">{j.status === 'DELIVERED' ? 'Delivered' : 'Back at the store'} · {usd(j.earningsUsd)} earned</Typography></View>
          <Button label="Back to jobs" variant="outline" onPress={() => router.replace('/drive')} />
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  links: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  gap: { gap: spacing.sm, marginTop: spacing.sm },
  cash: { borderRadius: radius.md, padding: spacing.md, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
});
