import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { OptionPicker } from '../common/OptionPicker';
import { Pill } from '../merchant/ui';
import { useReturnEligibility, useOpsAction, opsApi, RETURN_REASON_LABEL, ReturnRequest } from '../../hooks/useOps';
import { usePickupPoints } from '../../hooks/useMarket';
import { getErrorMessage } from '../../utils/format';
import { notify, confirmAction } from '../../utils/notify';
import { radius, spacing } from '../../theme/spacing';
import { useMarketTheme } from './useMarketTheme';

const STATUS: Record<ReturnRequest['status'], { label: string; tone: 'info' | 'warn' | 'good' | 'bad' }> = {
  APPROVED: { label: 'Drop it off', tone: 'warn' },
  DROPPED_OFF: { label: 'On its way to us', tone: 'info' },
  RECEIVED: { label: 'Being inspected', tone: 'info' },
  REFUNDED: { label: 'Refunded', tone: 'good' },
  REJECTED: { label: 'Not accepted', tone: 'bad' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
};

function Chips<T extends string>({ value, options, onChange }: { value: T | null; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  const t = useMarketTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <TouchableOpacity key={o.value} disabled={o.disabled} onPress={() => onChange(o.value)}
          style={[styles.chip, { backgroundColor: value === o.value ? t.primary : t.surfaceVariant, opacity: o.disabled ? 0.4 : 1 }]}>
          <Typography variant="caption" weight="bold" style={{ color: value === o.value ? '#fff' : t.text }}>{o.label}</Typography>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Returns on an order: existing requests, and a form for items still inside the return window */
export function ReturnsSection({ orderId, paidByCash }: { orderId: string; paidByCash: boolean }) {
  const t = useMarketTheme();
  const { data } = useReturnEligibility(orderId);
  const { data: points } = usePickupPoints();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnRequest['reason'] | null>(null);
  const [details, setDetails] = useState('');
  const [method, setMethod] = useState<'DROP_OFF' | 'COURIER_COLLECTION'>('DROP_OFF');
  const [pointId, setPointId] = useState<string | null>(null);
  const [refundTo, setRefundTo] = useState<'WALLET' | 'ORIGINAL'>('WALLET');
  const create = useOpsAction(() => opsApi.createReturn({
    orderId,
    items: Object.entries(qty).filter(([, n]) => n > 0).map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
    reason: reason!, details: details.trim() || undefined, method,
    pickupPointId: method === 'DROP_OFF' ? pointId ?? undefined : undefined, refundDestination: refundTo,
  }));
  const cancel = useOpsAction((id: string) => opsApi.cancelReturn(id));

  if (!data) return null;
  const returnable = data.items.filter((i) => i.returnableQuantity > 0);
  if (!returnable.length && !data.returns.length) return null;
  const chosen = Object.values(qty).some((n) => n > 0);
  const missing = !chosen ? 'Choose what you are returning' : !reason ? 'Tell us what went wrong' : method === 'DROP_OFF' && !pointId ? 'Choose where you will drop it off' : null;
  const refund = returnable.reduce((s, i) => s + (qty[i.orderItemId] ?? 0) * i.unitPriceUsd, 0);

  const submit = async () => {
    try {
      const r = await create.mutateAsync(undefined);
      setOpen(false);
      setQty({});
      notify(`Return ${r.reference} approved`, method === 'DROP_OFF'
        ? `Write ${r.reference} on the parcel and drop it at ${r.pickupPoint?.name}.`
        : `Write ${r.reference} on the parcel. Our courier will contact you to collect it.`);
    } catch (e) {
      notify('Could not start the return', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Typography variant="body" weight="bold">Returns</Typography>
      {data.returns.map((r) => (
        <View key={r.id} style={styles.returnRow}>
          <View style={styles.flex}>
            <Typography variant="bodySm" weight="semibold">{r.reference} · {r.items.map((i) => `${i.quantity} × ${i.title}`).join(', ')}</Typography>
            <Typography variant="caption" color={t.textSecondary}>
              {r.status === 'APPROVED' ? (r.method === 'DROP_OFF' ? `Write ${r.reference} on the parcel and drop it at ${r.pickupPoint?.name}` : `Write ${r.reference} on the parcel; we'll collect it`)
                : r.status === 'REFUNDED' ? `$${r.refundUsd?.toFixed(2)} refunded to ${r.refundDestination === 'WALLET' ? 'your wallet' : 'your original payment'}`
                : r.inspectionNote ?? RETURN_REASON_LABEL[r.reason]}
            </Typography>
            {r.status === 'APPROVED' && (
              <TouchableOpacity onPress={async () => {
                if (await confirmAction('Cancel this return?', 'You can start a new one while the return window is open.', 'Cancel return', true)) {
                  cancel.mutateAsync(r.id).catch((e) => notify('Could not cancel', getErrorMessage(e)));
                }
              }}>
                <Typography variant="caption" weight="bold" color={t.accent}>Cancel return</Typography>
              </TouchableOpacity>
            )}
          </View>
          <Pill label={STATUS[r.status].label} tone={STATUS[r.status].tone} />
        </View>
      ))}

      {returnable.length > 0 && !open && (
        <>
          <Typography variant="caption" color={t.textSecondary}>
            Defective, wrong or damaged items can be returned within {data.returnWindowDays} days of delivery.
          </Typography>
          <Button label="Return an item" variant="outline" size="sm" onPress={() => setOpen(true)} />
        </>
      )}

      {open && (
        <View style={styles.form}>
          {returnable.map((i) => {
            const n = qty[i.orderItemId] ?? 0;
            return (
              <View key={i.orderItemId} style={styles.itemRow}>
                <View style={styles.flex}>
                  <Typography variant="bodySm" numberOfLines={2}>{i.title}</Typography>
                  <Typography variant="caption" color={t.textSecondary}>Return by {new Date(i.returnBy!).toLocaleDateString()}</Typography>
                </View>
                <TouchableOpacity onPress={() => setQty((q) => ({ ...q, [i.orderItemId]: Math.max(0, n - 1) }))} style={[styles.qtyBtn, { borderColor: t.border }]} accessibilityLabel={`Fewer ${i.title}`}>
                  <Minus size={14} color={t.text} />
                </TouchableOpacity>
                <Typography variant="bodySm" weight="bold" style={styles.qty}>{n}</Typography>
                <TouchableOpacity onPress={() => setQty((q) => ({ ...q, [i.orderItemId]: Math.min(i.returnableQuantity, n + 1) }))} style={[styles.qtyBtn, { borderColor: t.border }]} accessibilityLabel={`More ${i.title}`}>
                  <Plus size={14} color={t.text} />
                </TouchableOpacity>
              </View>
            );
          })}
          <Typography variant="bodySm" weight="semibold">What went wrong?</Typography>
          <Chips value={reason} onChange={setReason} options={(Object.keys(RETURN_REASON_LABEL) as ReturnRequest['reason'][]).map((k) => ({ value: k, label: RETURN_REASON_LABEL[k] }))} />
          <TextInput value={details} onChangeText={setDetails} placeholder="Tell us more (optional)" placeholderTextColor={t.textSecondary} multiline
            style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} />
          <Typography variant="bodySm" weight="semibold">How will you send it back?</Typography>
          <Chips value={method} onChange={setMethod} options={[{ value: 'DROP_OFF', label: 'Drop off at a pickup point' }, { value: 'COURIER_COLLECTION', label: 'Collect from me' }]} />
          {method === 'DROP_OFF' && (
            <OptionPicker label="Pickup point" placeholder="Choose a pickup point" value={pointId}
              options={(points ?? []).map((p) => ({ value: p.id, label: p.name, hint: `${p.city.name} · ${p.address}` }))} onChange={setPointId} />
          )}
          <Typography variant="bodySm" weight="semibold">Refund to</Typography>
          <Chips value={refundTo} onChange={setRefundTo} options={[
            { value: 'WALLET', label: 'Kuwana wallet (instant)' },
            { value: 'ORIGINAL', label: paidByCash ? 'Original payment (not for cash)' : 'Original payment', disabled: paidByCash },
          ]} />
          {missing && <Typography variant="caption" color={t.textSecondary}>{missing}</Typography>}
          <View style={styles.row2}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} style={styles.flex} />
            <Button label={refund ? `Request $${refund.toFixed(2)} refund` : 'Request return'} size="sm" disabled={!!missing} loading={create.isPending} onPress={submit} style={styles.flex} />
          </View>
          <Typography variant="caption" color={t.textSecondary}>We refund once the item passes inspection at our hub.</Typography>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  returnRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  form: { gap: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qty: { minWidth: 18, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, minHeight: 60 },
  row2: { flexDirection: 'row', gap: spacing.sm },
});
