import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CheckCircle2, Clock, XCircle, MessageSquareText, PackageCheck, Truck, MapPin, Store } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import {
  useMarketOrder, useVerifyCod, useResendCod, usePayMarketOrder, useCancelMarketOrder, MarketOrder, PaymentMethod, ShipmentStatus,
} from '@/src/hooks/useMarket';
import { useAuthStore } from '@/src/store/auth-store';
import { ReturnsSection } from '@/src/components/marketplace/ReturnsSection';
import { formatPrice, currencyLabel, getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const SHIPMENT_STATUS: Record<ShipmentStatus, string> = {
  PENDING: 'Waiting for payment',
  PROCESSING: 'Being prepared',
  PACKED: 'Packed',
  DISPATCHED: 'On its way',
  OUT_FOR_DELIVERY: 'Out for delivery',
  READY_FOR_COLLECTION: 'Ready to collect',
  DELIVERED: 'Delivered',
  COLLECTED: 'Collected',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned to us',
};

const RETRY_METHODS: { method: Exclude<PaymentMethod, 'CASH'>; label: string; usdOnly?: boolean }[] = [
  { method: 'ECOCASH', label: 'EcoCash' },
  { method: 'ONEMONEY', label: 'OneMoney' },
  { method: 'INNBUCKS', label: 'InnBucks' },
  { method: 'ZIMSWITCH', label: 'Zimswitch' },
  { method: 'CARD', label: 'Card', usdOnly: true },
  { method: 'WALLET', label: 'Wallet', usdOnly: true },
];

/** "Fri 22 Nov" style dates for delivery estimates */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function useCountdown(until: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  if (!until) return null;
  const ms = Math.max(0, new Date(until).getTime() - now);
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
}

function StatusBanner({ order }: { order: MarketOrder }) {
  const t = useMarketTheme();
  const map = {
    PENDING_PAYMENT: { icon: Clock, color: t.warning, title: order.paymentStatus === 'FAILED' ? 'Payment didn’t go through' : 'Waiting for payment' },
    AWAITING_COD_OTP: { icon: MessageSquareText, color: t.warning, title: 'Confirm with the code we texted you' },
    AWAITING_DEPOSIT: { icon: Clock, color: t.warning, title: order.paymentStatus === 'FAILED' ? 'The delivery fee payment didn’t go through' : 'Pay the delivery fee to confirm your order' },
    CONFIRMED: { icon: CheckCircle2, color: t.success, title: 'Order confirmed' },
    COMPLETED: { icon: CheckCircle2, color: t.success, title: 'Order complete' },
    CANCELLED: { icon: XCircle, color: t.error, title: 'Order cancelled' },
  }[order.status];
  const Icon = map.icon;
  return (
    <View style={[styles.banner, { backgroundColor: t.surface, borderColor: map.color }]}>
      <Icon size={22} color={map.color} />
      <View style={styles.flex}>
        <Typography variant="body" weight="bold">{map.title}</Typography>
        <Typography variant="caption" color={t.textSecondary}>Order {order.reference}</Typography>
        {order.status === 'CONFIRMED' && (
          <Typography variant="caption" color={t.textSecondary}>
            {order.paymentStatus === 'COD_PENDING' ? `Pay ${currencyLabel(order.paymentCurrency)} cash on ${order.deliveryMode === 'PICKUP' ? 'collection' : 'delivery'}. ` : ''}
            We texted the collection PIN to {order.recipient.phone}.
          </Typography>
        )}
        {order.status === 'CANCELLED' && !!order.cancelReason && (
          <Typography variant="caption" color={t.textSecondary}>{order.cancelReason}</Typography>
        )}
      </View>
    </View>
  );
}

function CodPanel({ order }: { order: MarketOrder }) {
  const t = useMarketTheme();
  const [code, setCode] = useState('');
  const verify = useVerifyCod();
  const resend = useResendCod();
  const left = useCountdown(order.expiresAt);
  const resendWait = useCountdown(order.codOtp?.resendAvailableAt ?? null);
  const canResend = !resendWait || resendWait === '0:00';

  const submit = async () => {
    try {
      await verify.mutateAsync({ id: order.id, code });
    } catch (e) {
      notify('Could not confirm', getErrorMessage(e));
      setCode('');
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Typography variant="bodySm" color={t.textSecondary}>
        Enter the 6-digit code we sent to your phone. Unconfirmed cash orders are cancelled{left ? ` in ${left}` : ''}.
      </Typography>
      <TextInput
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        keyboardType="number-pad"
        maxLength={6}
        placeholderTextColor={t.textSecondary}
        style={[styles.otp, { backgroundColor: t.surfaceVariant, color: t.text }]}
        accessibilityLabel="Confirmation code"
      />
      <Button label="Confirm order" onPress={submit} loading={verify.isPending} disabled={code.length !== 6} />
      <Button
        label={canResend ? 'Send a new code' : `Send a new code in ${resendWait}`}
        variant="ghost"
        size="sm"
        disabled={!canResend || resend.isPending}
        onPress={() => resend.mutateAsync({ id: order.id }).catch((e) => notify('Could not resend', getErrorMessage(e)))}
      />
    </View>
  );
}

function PaymentPanel({ order }: { order: MarketOrder }) {
  const t = useMarketTheme();
  const user = useAuthStore((s) => s.user);
  const pay = usePayMarketOrder();
  const left = useCountdown(order.expiresAt);
  // A COD order's deposit can only be paid by EcoCash or InnBucks
  const isDeposit = order.status === 'AWAITING_DEPOSIT';
  const methods = isDeposit ? RETRY_METHODS.filter((m) => m.method === 'ECOCASH' || m.method === 'INNBUCKS') : RETRY_METHODS;
  const [method, setMethod] = useState<Exclude<PaymentMethod, 'CASH'>>(
    order.payment?.method && order.payment.method !== 'CASH' ? order.payment.method : order.paymentMethod === 'CASH' ? 'ECOCASH' : order.paymentMethod,
  );
  const [phone, setPhone] = useState(user?.phone ?? '+263');
  const failed = order.paymentStatus === 'FAILED';
  const processing = order.payment?.status === 'PROCESSING';
  const needsPhone = ['ECOCASH', 'ONEMONEY', 'INNBUCKS'].includes(method);

  const retry = async () => {
    try {
      const res = await pay.mutateAsync({ id: order.id, paymentMethod: method, paymentPhone: needsPhone ? phone : undefined });
      if (res?.payment?.redirectUrl) await WebBrowser.openBrowserAsync(res.payment.redirectUrl).catch(() => {});
    } catch (e) {
      notify('Payment not started', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Typography variant="h3" weight="bold">
        {formatPrice({ usd: order.amountDue.amount, zwg: order.amountDue.amount }, order.paymentCurrency)}
      </Typography>
      {isDeposit && order.totals.cashOnDelivery && (
        <Typography variant="bodySm" color={t.textSecondary}>
          Delivery fee, paid now and non-refundable. You pay {formatPrice(order.totals.cashOnDelivery, order.paymentCurrency)} cash to the driver.
        </Typography>
      )}
      {processing && !failed && (
        <View style={styles.inline}>
          <ActivityIndicator size="small" color={t.accent} />
          <Typography variant="bodySm" style={styles.flex}>{order.payment?.instructions ?? 'Waiting for the payment to be approved…'}</Typography>
        </View>
      )}
      {processing && order.payment?.redirectUrl && (
        <Button label="Open payment page" variant="outline" onPress={() => WebBrowser.openBrowserAsync(order.payment!.redirectUrl!)} />
      )}
      {left && <Typography variant="caption" color={t.textSecondary}>We hold your items for {left} more.</Typography>}

      <Typography variant="bodySm" weight="bold" style={styles.mtSm}>{failed ? 'Try again with' : 'Or pay another way'}</Typography>
      <View style={styles.chips}>
        {methods.filter((m) => !m.usdOnly || order.paymentCurrency === 'USD').map((m) => (
          <TouchableOpacity
            key={m.method}
            onPress={() => setMethod(m.method)}
            style={[styles.chip, { backgroundColor: method === m.method ? t.primary : t.surfaceVariant }]}
          >
            <Typography variant="caption" weight="bold" style={{ color: method === m.method ? '#fff' : t.text }}>{m.label}</Typography>
          </TouchableOpacity>
        ))}
      </View>
      {needsPhone && (
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+2637XXXXXXXX" placeholderTextColor={t.textSecondary}
          style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Mobile number to charge" />
      )}
      <Button label="Pay now" onPress={retry} loading={pay.isPending} />
    </View>
  );
}

export default function MarketOrderScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, error, refetch } = useMarketOrder(id);
  const cancel = useCancelMarketOrder();

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  }
  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Typography color={t.textSecondary}>{getErrorMessage(error, 'Order not found')}</Typography>
        <Button label="Try again" variant="outline" onPress={() => refetch()} style={styles.mtSm} />
      </View>
    );
  }

  const cur = order.paymentCurrency;
  const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'AWAITING_COD_OTP' || order.status === 'AWAITING_DEPOSIT'
    || (order.status === 'CONFIRMED' && order.paymentStatus === 'COD_PENDING' && order.shipments.every((s) => s.status === 'PROCESSING'));
  const addr = order.deliveryAddress as Record<string, string | null>;

  const onCancel = async () => {
    const keepsDeposit = !!order.depositPaidAt;
    const message = keepsDeposit
      ? 'Your items go back on sale. The delivery fee you paid upfront is not refunded.'
      : 'Your items go back on sale and nothing is charged.';
    if (!(await confirmAction('Cancel this order?', message, 'Cancel order', true))) return;
    try {
      await cancel.mutateAsync({ id: order.id });
    } catch (e) {
      notify('Could not cancel', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: `Order ${order.reference}` }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StatusBanner order={order} />
        {order.status === 'AWAITING_COD_OTP' && <CodPanel order={order} />}
        {(order.status === 'PENDING_PAYMENT' || order.status === 'AWAITING_DEPOSIT') && <PaymentPanel order={order} />}

        {order.shipments.map((sh, i) => (
          <View key={sh.id} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.rowBetween}>
              <View style={[styles.inline, styles.flex]}>
                {sh.sourceType === 'PLATFORM_FULFILLED' ? <PackageCheck size={15} color={t.accent} /> : <Truck size={15} color={t.textSecondary} />}
                <Typography variant="bodySm" weight="bold" style={styles.flex}>Parcel {i + 1} · {sh.source}</Typography>
              </View>
              <View style={[styles.status, { backgroundColor: t.surfaceVariant }]}>
                <Typography variant="caption" weight="bold">
                  {sh.status === 'PENDING' && (order.status === 'AWAITING_COD_OTP' || order.status === 'AWAITING_DEPOSIT') ? 'Waiting for confirmation' : SHIPMENT_STATUS[sh.status]}
                </Typography>
              </View>
            </View>
            <Typography variant="caption" color={t.textSecondary}>
              {sh.tierLabel}
              {order.status === 'CONFIRMED' && sh.status !== 'CANCELLED'
                ? sh.estimatedAt
                  ? ` · expected around ${new Date(sh.estimatedAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : ` · expected ${sh.etaMinDays === sh.etaMaxDays ? shortDate(sh.estimatedTo) : `${shortDate(sh.estimatedFrom)} – ${shortDate(sh.estimatedTo)}`}`
                : ''}
              {sh.distanceKm !== null ? ` · ${sh.distanceKm} km from the store` : ''}
            </Typography>
            {sh.items.map((it) => (
              <TouchableOpacity key={it.id} style={styles.item} onPress={() => router.push({ pathname: '/catalog/[slug]', params: { slug: it.productId } })}>
                <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
                  {it.image ? <Image source={{ uri: it.image }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
                </View>
                <View style={styles.flex}>
                  <Typography variant="bodySm" numberOfLines={2}>{it.title}</Typography>
                  <Typography variant="caption" color={t.textSecondary}>{it.quantity} × {formatPrice(it.unitPrice, cur)} · {it.sellerName}</Typography>
                </View>
                <Typography variant="bodySm" weight="semibold">{formatPrice(it.lineTotal, cur)}</Typography>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.inline}>
            {order.deliveryMode === 'PICKUP' ? <Store size={15} color={t.textSecondary} /> : <MapPin size={15} color={t.textSecondary} />}
            <Typography variant="bodySm" weight="bold">{order.deliveryMode === 'PICKUP' ? 'Collect from' : 'Deliver to'}</Typography>
          </View>
          <Typography variant="bodySm">
            {order.deliveryMode === 'PICKUP' ? addr.name : [addr.line1, addr.line2, addr.suburb].filter(Boolean).join(', ')}
          </Typography>
          <Typography variant="caption" color={t.textSecondary}>
            {[order.deliveryMode === 'PICKUP' ? addr.address : null, addr.city].filter(Boolean).join(', ')}
          </Typography>
          {!!addr.landmark && <Typography variant="caption" color={t.textSecondary}>Landmark: {addr.landmark}</Typography>}
          <Typography variant="caption" color={t.textSecondary} style={styles.mtSm}>
            Receiver: {order.recipient.name} · {order.recipient.phone}{order.recipient.isGift ? ' (gift)' : ''}
          </Typography>
        </View>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          {([
            ['Items', order.totals.itemsSubtotal],
            ['Delivery', order.totals.delivery],
            ['Seller shipping', order.totals.sellerShipping],
            ['Cash on delivery fee', order.totals.codFee],
          ] as const).filter(([label, m]) => label === 'Items' || label === 'Delivery' || m.usd > 0).map(([label, m]) => (
            <View key={label} style={styles.rowBetween}>
              <Typography variant="bodySm" color={t.textSecondary}>{label}</Typography>
              <Typography variant="bodySm">{label === 'Delivery' && m.usd === 0 ? 'Free' : formatPrice(m, cur)}</Typography>
            </View>
          ))}
          <View style={[styles.rowBetween, styles.totalRow, { borderColor: t.border }]}>
            <Typography variant="body" weight="bold">Total ({currencyLabel(cur)})</Typography>
            <Typography variant="body" weight="bold">{formatPrice(order.totals.total, cur)}</Typography>
          </View>
          {order.totals.codDeposit && order.totals.cashOnDelivery && (
            <>
              <View style={styles.rowBetween}>
                <Typography variant="bodySm" color={t.textSecondary}>Delivery fee {order.depositPaidAt ? 'paid upfront' : 'to pay upfront'}</Typography>
                <Typography variant="bodySm">{formatPrice(order.totals.codDeposit, cur)}</Typography>
              </View>
              <View style={styles.rowBetween}>
                <Typography variant="bodySm" weight="semibold">Cash to the driver</Typography>
                <Typography variant="bodySm" weight="semibold">{formatPrice(order.totals.cashOnDelivery, cur)}</Typography>
              </View>
            </>
          )}
          {cur === 'ZWG' && (
            <Typography variant="caption" color={t.textSecondary}>Rate fixed at $1 = ZiG {order.lockedExchangeRate.toFixed(2)} when you ordered.</Typography>
          )}
        </View>

        {order.shipments.some((s) => s.status === 'DELIVERED' || s.status === 'COLLECTED') && (
          <ReturnsSection orderId={order.id} paidByCash={order.paymentMethod === 'CASH'} />
        )}

        {canCancel && <Button label="Cancel order" variant="ghost" onPress={onCancel} loading={cancel.isPending} />}
        <Button label="Continue shopping" variant="outline" onPress={() => router.replace('/(tabs)/search')} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  banner: { flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'flex-start' },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  status: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden' },
  otp: { borderRadius: radius.md, paddingVertical: 14, fontSize: 26, letterSpacing: 10, textAlign: 'center', fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: 4 },
  mtSm: { marginTop: spacing.sm },
});
