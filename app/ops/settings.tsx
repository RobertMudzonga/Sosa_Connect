import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Switch, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMarketSettings, useRateHistory, useOpsAction, opsApi, MarketSettings } from '@/src/hooks/useOps';
import { useCategoryTree, useExchangeRate, CategoryNode, VehicleClass } from '@/src/hooks/useCatalog';

const VEHICLE_LABEL: Record<VehicleClass, string> = { BIKE: 'Motorbike', CAR: 'Car', BAKKIE: 'Bakkie' };
import { getErrorMessage, formatDateTime } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

/** Settings shown in the form: key, label, unit hint, and section */
const FIELDS: { key: string; label: string; section: string; unit?: string }[] = [
  { key: 'freeDeliveryThresholdUsd', label: 'Free delivery from', unit: 'USD', section: 'Delivery' },
  { key: 'metroNextDayFeeUsd', label: 'Metro next-day', unit: 'USD', section: 'Delivery' },
  { key: 'metroSameDayFeeUsd', label: 'Metro same-day', unit: 'USD', section: 'Delivery' },
  { key: 'sameDayCutoffHour', label: 'Same-day order cut-off', unit: 'hour', section: 'Delivery' },
  { key: 'intercityFeeUsd', label: 'Intercity courier', unit: 'USD', section: 'Delivery' },
  { key: 'pickupFeeUsd', label: 'Pickup point (local)', unit: 'USD', section: 'Delivery' },
  { key: 'intercityPickupFeeUsd', label: 'Pickup point (intercity)', unit: 'USD', section: 'Delivery' },
  { key: 'heavyThresholdKg', label: 'Heavy parcel above', unit: 'kg', section: 'Delivery' },
  { key: 'heavySurchargePerKgUsd', label: 'Heavy surcharge per kg', unit: 'USD', section: 'Delivery' },
  { key: 'maxDeliveryAttempts', label: 'Delivery attempts before return', section: 'Delivery' },
  { key: 'codMaxOrderUsd', label: 'Max cash order', unit: 'USD', section: 'Cash on delivery' },
  { key: 'codMinTrustScore', label: 'Minimum trust score', unit: '0–100', section: 'Cash on delivery' },
  { key: 'codFeeUsd', label: 'COD fee', unit: 'USD', section: 'Cash on delivery' },
  { key: 'codOtpTimeoutMinutes', label: 'Time to confirm with code', unit: 'min', section: 'Cash on delivery' },
  { key: 'paymentTimeoutMinutes', label: 'Time to pay online', unit: 'min', section: 'Orders & sellers' },
  { key: 'returnWindowDays', label: 'Return window', unit: 'days', section: 'Orders & sellers' },
  { key: 'minPayoutUsd', label: 'Minimum payout', unit: 'USD', section: 'Orders & sellers' },
  { key: 'storeAcceptSlaMinutes', label: 'Time for a store to accept an order', unit: 'min', section: 'Stores & drivers' },
  { key: 'escrowHoldHours', label: 'Store earnings in escrow after delivery', unit: 'hours', section: 'Stores & drivers' },
  { key: 'maxDeliveryRadiusKm', label: 'Max store-to-buyer distance', unit: 'km', section: 'Stores & drivers' },
  { key: 'jobBroadcastRadiusKm', label: 'Offer new jobs to drivers within', unit: 'km', section: 'Stores & drivers' },
  { key: 'collateralBufferPct', label: 'Driver collateral above parcel value', unit: '%', section: 'Stores & drivers' },
  { key: 'driverMaxActiveJobs', label: 'Jobs a driver may hold at once', section: 'Stores & drivers' },
  { key: 'pickupPointDiscountPct', label: 'Pickup-point delivery discount', unit: '%', section: 'Stores & drivers' },
];

/** On/off rules, shown at the top of their section */
const TOGGLES: { key: 'codEnabled' | 'hubsEnabled' | 'codDepositRequired'; label: string; hint?: string; section: string }[] = [
  { key: 'codEnabled', label: 'Offer cash on delivery', section: 'Cash on delivery' },
  { key: 'codDepositRequired', label: 'Delivery fee paid upfront', hint: 'EcoCash / InnBucks deposit (non-refundable); only goods paid in cash', section: 'Cash on delivery' },
  { key: 'hubsEnabled', label: 'Kuwana hubs hold stock', hint: 'Off = zero-warehouse: every order is packed at a store branch', section: 'Stores & drivers' },
];

function ExchangeRatePanel() {
  const t = useMarketTheme();
  const { data: current } = useExchangeRate();
  const { data: history } = useRateHistory();
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const save = useOpsAction(() => opsApi.setRate({ rate: Number(rate), note: note.trim() || undefined }));
  return (
    <Panel title="USD → ZiG rate" right={current ? <Pill label={`$1 = ZiG ${current.rate.toFixed(4)}`} tone="info" /> : undefined}>
      <View style={styles.row}>
        <View style={styles.flex}><Field label="New rate (ZiG per $1)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder={current ? String(current.rate) : '26.75'} /></View>
        <View style={styles.flex}><Field label="Source / note" value={note} onChangeText={setNote} placeholder="e.g. RBZ interbank mid" /></View>
      </View>
      <Button label="Apply now" size="sm" disabled={!(Number(rate) > 0)} loading={save.isPending}
        onPress={() => save.mutateAsync(undefined).then(() => { setRate(''); setNote(''); }).catch((e) => notify('Could not set the rate', getErrorMessage(e)))} />
      <Typography variant="caption" color={t.textSecondary}>Applies to new carts and orders immediately. Placed orders keep the rate they were placed at.</Typography>
      {(history ?? []).map((h) => (
        <View key={h.id} style={styles.rowBetween}>
          <Typography variant="caption" color={t.textSecondary} style={styles.flex}>{formatDateTime(h.effectiveFrom)}{h.note ? ` · ${h.note}` : ''}{h.setBy ? ` · ${h.setBy}` : ''}</Typography>
          <Typography variant="caption" weight="bold">{h.rate}{h.status !== 'PAST' ? ` (${h.status.toLowerCase()})` : ''}</Typography>
        </View>
      ))}
    </Panel>
  );
}

function SettingsPanel() {
  const t = useMarketTheme();
  const { data, isLoading } = useMarketSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!data) return;
    setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(data[f.key] ?? '')])));
    setToggles(Object.fromEntries(TOGGLES.map((tg) => [tg.key, !!data[tg.key]])));
  }, [data]);
  const save = useOpsAction((body: MarketSettings) => opsApi.updateSettings(body));

  if (isLoading || !data) return <ActivityIndicator color={t.accent} />;
  const changed = FIELDS.filter((f) => form[f.key] !== String(data[f.key]));
  const togglesChanged = TOGGLES.some((tg) => toggles[tg.key] !== !!data[tg.key]);
  const submit = () => {
    const body: MarketSettings = { ...toggles };
    for (const f of changed) body[f.key] = Number(form[f.key]);
    save.mutateAsync(body).then(() => notify('Saved', 'New rules apply to new quotes and orders.')).catch((e) => notify('Could not save', getErrorMessage(e)));
  };

  return (
    <>
      {[...new Set(FIELDS.map((f) => f.section))].map((section) => (
        <Panel key={section} title={section}>
          {TOGGLES.filter((tg) => tg.section === section).map((tg) => (
            <View key={tg.key} style={styles.rowBetween}>
              <View style={styles.flex}>
                <Typography variant="bodySm" weight="semibold">{tg.label}</Typography>
                {tg.hint && <Typography variant="caption" color={t.textSecondary}>{tg.hint}</Typography>}
              </View>
              <Switch value={!!toggles[tg.key]} onValueChange={(v) => setToggles((s) => ({ ...s, [tg.key]: v }))} />
            </View>
          ))}
          <View style={styles.grid}>
            {FIELDS.filter((f) => f.section === section).map((f) => (
              <View key={f.key} style={styles.cell}>
                <Field label={f.unit ? `${f.label} (${f.unit})` : f.label} value={form[f.key] ?? ''} keyboardType="decimal-pad"
                  onChangeText={(v) => setForm((s) => ({ ...s, [f.key]: v }))} />
              </View>
            ))}
          </View>
        </Panel>
      ))}
      <Button label={changed.length || togglesChanged ? 'Save rules' : 'No changes'} disabled={!changed.length && !togglesChanged}
        loading={save.isPending} onPress={submit} />
    </>
  );
}

function CategoryRow({ c, depth }: { c: CategoryNode; depth: number }) {
  const [commission, setCommission] = useState('');
  const [fee, setFee] = useState('');
  const save = useOpsAction(() => opsApi.updateCategory(c.id, {
    ...(commission ? { commissionRate: Number(commission) } : {}),
    ...(fee ? { fulfilmentFeeUsd: Number(fee) } : {}),
  }));
  const t = useMarketTheme();
  const flags = useOpsAction((body: { requiredVehicleClass?: VehicleClass; isReturnable?: boolean }) => opsApi.updateCategory(c.id, body));
  const setFlag = (body: { requiredVehicleClass?: VehicleClass; isReturnable?: boolean }) => flags.mutateAsync(body).catch((e) => notify('Could not save', getErrorMessage(e)));
  const nextVehicle: Record<VehicleClass, VehicleClass> = { BIKE: 'CAR', CAR: 'BAKKIE', BAKKIE: 'BIKE' };
  return (
    <View style={[styles.catRow, { paddingLeft: depth * 16 }]}>
      <View style={styles.flex}>
        <Typography variant="bodySm" weight={depth ? 'regular' : 'semibold'}>{c.name}</Typography>
        <View style={styles.catFlags}>
          <TouchableOpacity onPress={() => setFlag({ requiredVehicleClass: nextVehicle[c.requiredVehicleClass] })} disabled={flags.isPending} accessibilityLabel={`${c.name} vehicle`}>
            <Typography variant="caption" weight="semibold" color={t.accent}>{VEHICLE_LABEL[c.requiredVehicleClass]}</Typography>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFlag({ isReturnable: !c.isReturnable })} disabled={flags.isPending} accessibilityLabel={`${c.name} returns`}>
            <Typography variant="caption" weight="semibold" color={c.isReturnable ? t.accent : t.warning}>{c.isReturnable ? 'Returnable' : 'Final sale'}</Typography>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.small}><Field label="%" value={commission} onChangeText={setCommission} keyboardType="decimal-pad" placeholder={String(c.commissionRate ?? '')} /></View>
      <View style={styles.small}><Field label="Fee $" value={fee} onChangeText={setFee} keyboardType="decimal-pad" placeholder={String(c.fulfilmentFeeUsd ?? '')} /></View>
      <Button label="Set" size="sm" variant="ghost" disabled={!commission && !fee} loading={save.isPending}
        onPress={() => save.mutateAsync(undefined).then(() => { setCommission(''); setFee(''); notify('Saved', `${c.name} updated for new orders.`); }).catch((e) => notify('Could not save', getErrorMessage(e)))} />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useMarketTheme();
  const { data: tree } = useCategoryTree();
  const flat = (nodes: CategoryNode[], depth = 0): { c: CategoryNode; depth: number }[] => nodes.flatMap((c) => [{ c, depth }, ...flat(c.children, depth + 1)]);
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <ExchangeRatePanel />
      <SettingsPanel />
      <Panel title="Categories">
        <Typography variant="caption" color={t.textSecondary}>Grey values are current. Enter a new referral commission (%) or per-unit hub fulfilment fee ($); applies to orders placed from now on. Tap the vehicle to change the smallest vehicle that can carry the category, and Returnable / Final sale to switch returns (final-sale items can still come back if wrong or damaged).</Typography>
        {flat(tree ?? []).map(({ c, depth }) => <CategoryRow key={c.id} c={c} depth={depth} />)}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexBasis: '47%', flexGrow: 1 },
  catRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  small: { width: 70 },
  catFlags: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, marginTop: 2 },
});
