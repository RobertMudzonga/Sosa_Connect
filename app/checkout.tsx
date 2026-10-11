import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MapPin, Check, Plus, AlertTriangle } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { TextField, Chip } from '@/src/components/common/TextField';
import { AddressForm } from '@/src/components/features/AddressForm';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/src/store/cart-store';
import { useAuthStore } from '@/src/store/auth-store';
import { useAddresses, formatAddress } from '@/src/hooks/useAddresses';
import { useQuote, usePlaceOrder, CheckoutRequest, FulfilmentType, PaymentMethod } from '@/src/hooks/useOrders';
import { PAYMENT_METHOD_LABELS } from '@/src/utils/orderStatus';
import { formatMoney, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { isValidZwMobile, normalizeZwPhone } from '@/src/utils/phone';

const PAYMENT_METHODS: PaymentMethod[] = ['ECOCASH', 'ONEMONEY', 'CARD', 'CASH'];
const MOBILE_MONEY: PaymentMethod[] = ['ECOCASH', 'ONEMONEY'];

/** ASAP plus half-hour slots starting an hour from now */
const buildTimeSlots = () => {
  const slots: { label: string; value: string | null }[] = [{ label: 'ASAP', value: null }];
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  for (let i = 0; i < 8; i++) {
    const slot = new Date(start.getTime() + i * 30 * 60 * 1000);
    slots.push({
      label: slot.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      value: slot.toISOString(),
    });
  }
  return slots;
};


export default function CheckoutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { items, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const { data: addresses, isLoading: loadingAddresses } = useAddresses();
  const placeOrder = usePlaceOrder();

  const [fulfilment, setFulfilment] = useState<FulfilmentType>('DELIVERY');
  const [addressId, setAddressId] = useState<string | undefined>();
  const [addingAddress, setAddingAddress] = useState(false);
  const [timeSlots] = useState(buildTimeSlots);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ECOCASH');
  const [paymentPhone, setPaymentPhone] = useState(user?.phone ?? '');
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  // Pick the default (or first) saved address once loaded
  useEffect(() => {
    if (addressId || !addresses?.length) return;
    setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
  }, [addresses, addressId]);

  // Notes are left out of the quote so typing doesn't refetch prices
  const quoteRequest: CheckoutRequest | null = useMemo(() => items.length === 0 ? null : {
    items: items.map((i) => ({
      serviceId: i.serviceId,
      quantity: i.quantity,
      optionIds: i.options.map((o) => o.optionId),
      notes: i.notes,
    })),
    fulfilment,
    addressId: fulfilment === 'DELIVERY' ? addressId : undefined,
    paymentMethod,
    scheduledFor,
    promoCode,
  }, [items, fulfilment, addressId, paymentMethod, scheduledFor, promoCode]);

  const { data: quote, isFetching: quoting, error: quoteError } = useQuote(quoteRequest);

  if (items.length === 0 && !placeOrder.isSuccess) {
    return (
      <View style={[styles.center, { backgroundColor: activeTheme.background }]}>
        <Typography variant="body" color={activeTheme.textSecondary}>Your cart is empty.</Typography>
        <Button label="Browse" variant="primary" style={{ marginTop: spacing.md }} onPress={() => router.replace('/search')} />
      </View>
    );
  }

  const needsAddress = fulfilment === 'DELIVERY' && !addressId;
  const needsPhone = MOBILE_MONEY.includes(paymentMethod) && !isValidZwMobile(paymentPhone);
  const blockingErrors = quote?.errors ?? [];
  const needsVerifiedPhone = !user?.phoneVerified;
  const canPlace = !!quote && !quoting && !needsAddress && !needsPhone && !needsVerifiedPhone && blockingErrors.length === 0;

  const handlePlaceOrder = async () => {
    if (!quoteRequest || !canPlace) return;
    try {
      const result = await placeOrder.mutateAsync({
        ...quoteRequest,
        paymentPhone: MOBILE_MONEY.includes(paymentMethod) ? normalizeZwPhone(paymentPhone) ?? undefined : undefined,
        notes: notes.trim() || undefined,
      });
      clearCart();

      const payment = result.payment;
      if (payment?.redirectUrl) {
        await WebBrowser.openBrowserAsync(payment.redirectUrl);
      } else if (payment?.instructions) {
        notify('Complete your payment', payment.instructions);
      }

      if (result.orders.length === 1) {
        router.replace({ pathname: '/orders/[id]', params: { id: result.orders[0].id } });
      } else {
        router.replace('/orders');
      }
    } catch (error) {
      notify('Could not place order', getErrorMessage(error));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {needsVerifiedPhone && (
          <View style={[styles.warning, { backgroundColor: palette.warning + '20', marginTop: 0 }]}>
            <AlertTriangle size={16} color={palette.warning} />
            <Typography variant="bodySm" style={{ flex: 1 }}>Verify your phone number so the seller and driver can reach you.</Typography>
            <Button label="Verify" size="sm" variant="primary" onPress={() => router.push({ pathname: '/verify-phone', params: { returnTo: 'checkout' } })} />
          </View>
        )}

        {/* Fulfilment */}
        <Typography variant="h3" weight="bold" style={styles.sectionTitle}>How do you want it?</Typography>
        <View style={styles.row}>
          <Chip label="Delivery" selected={fulfilment === 'DELIVERY'} onPress={() => setFulfilment('DELIVERY')} />
          <Chip label="Collection" selected={fulfilment === 'COLLECTION'} onPress={() => setFulfilment('COLLECTION')} />
        </View>

        {/* Address */}
        {fulfilment === 'DELIVERY' && (
          <>
            <Typography variant="h3" weight="bold" style={styles.sectionTitle}>Deliver to</Typography>
            {loadingAddresses ? <ActivityIndicator color={activeTheme.primary} /> : (
              <>
                {(addresses ?? []).map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setAddressId(a.id)}
                    style={[styles.selectRow, { borderColor: addressId === a.id ? activeTheme.primary : activeTheme.border }]}
                  >
                    <MapPin size={18} color={addressId === a.id ? activeTheme.primary : activeTheme.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Typography variant="body" weight="semibold">{a.label}</Typography>
                      <Typography variant="caption" color={activeTheme.textSecondary}>{formatAddress(a)}</Typography>
                    </View>
                    {addressId === a.id && <Check size={18} color={activeTheme.primary} />}
                  </TouchableOpacity>
                ))}
                {addingAddress ? (
                  <Card variant="outlined" style={{ marginTop: spacing.sm }}>
                    <AddressForm
                      onSaved={(a) => { setAddressId(a.id); setAddingAddress(false); }}
                      onCancel={() => setAddingAddress(false)}
                    />
                  </Card>
                ) : (
                  <Button
                    label="Add a new address"
                    variant="ghost"
                    icon={<Plus size={16} color={activeTheme.primary} />}
                    onPress={() => setAddingAddress(true)}
                  />
                )}
              </>
            )}
          </>
        )}
        {fulfilment === 'COLLECTION' && (
          <Typography variant="bodySm" color={activeTheme.textSecondary} style={{ marginTop: spacing.sm }}>
            You will collect from the seller. Their address is shown on your order once it is accepted.
          </Typography>
        )}

        {/* Time */}
        <Typography variant="h3" weight="bold" style={styles.sectionTitle}>When?</Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {timeSlots.map((slot) => (
            <Chip
              key={slot.label}
              label={slot.label}
              selected={scheduledFor === slot.value}
              onPress={() => setScheduledFor(slot.value)}
            />
          ))}
        </ScrollView>

        {/* Payment */}
        <Typography variant="h3" weight="bold" style={styles.sectionTitle}>Payment</Typography>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method}
            onPress={() => setPaymentMethod(method)}
            style={[styles.selectRow, { borderColor: paymentMethod === method ? activeTheme.primary : activeTheme.border }]}
          >
            <Typography variant="body" style={{ flex: 1 }}>
              {method === 'CASH' && fulfilment === 'COLLECTION' ? 'Cash on collection' : PAYMENT_METHOD_LABELS[method]}
            </Typography>
            {paymentMethod === method && <Check size={18} color={activeTheme.primary} />}
          </TouchableOpacity>
        ))}
        {MOBILE_MONEY.includes(paymentMethod) && (
          <TextField
            label={`${PAYMENT_METHOD_LABELS[paymentMethod]} number`}
            placeholder="07X XXX XXXX"
            keyboardType="phone-pad"
            value={paymentPhone}
            onChangeText={setPaymentPhone}
            hint={needsPhone && paymentPhone ? 'Enter a valid Zimbabwean mobile number' : 'You will get a prompt on this phone to approve the payment'}
            style={{ marginTop: spacing.sm }}
          />
        )}

        {/* Promo */}
        <Typography variant="h3" weight="bold" style={styles.sectionTitle}>Promo code</Typography>
        <View style={styles.promoRow}>
          <View style={{ flex: 1 }}>
            <TextField placeholder="Enter code" autoCapitalize="characters" value={promoInput} onChangeText={setPromoInput} />
          </View>
          {promoCode ? (
            <Button label="Remove" variant="ghost" onPress={() => { setPromoCode(undefined); setPromoInput(''); }} />
          ) : (
            <Button label="Apply" variant="secondary" disabled={!promoInput.trim()} onPress={() => setPromoCode(promoInput.trim().toUpperCase())} />
          )}
        </View>
        {!!quote?.promoError && <Typography variant="caption" color={palette.danger}>{quote.promoError}</Typography>}
        {!!promoCode && !quote?.promoError && !!quote?.discount && (
          <Typography variant="caption" color={palette.success}>{promoCode} applied</Typography>
        )}

        <TextField label="Note for the seller (optional)" value={notes} onChangeText={setNotes} multiline maxLength={300} />

        {/* Summary */}
        <Card variant="outlined" style={styles.summary}>
          <Typography variant="body" weight="bold" style={{ marginBottom: spacing.md }}>Order Summary</Typography>
          {quoting && !quote ? <ActivityIndicator color={activeTheme.primary} /> : quoteError ? (
            <Typography variant="bodySm" color={palette.danger}>{getErrorMessage(quoteError, 'Could not calculate totals.')}</Typography>
          ) : quote ? (
            <>
              {quote.vendors.length > 1 && quote.vendors.map((v) => (
                <SummaryRow key={v.providerId} label={v.providerName} value={formatMoney(v.subtotal, quote.currency)} muted />
              ))}
              <SummaryRow label="Subtotal" value={formatMoney(quote.subtotal, quote.currency)} />
              {fulfilment === 'DELIVERY' && <SummaryRow label="Delivery" value={formatMoney(quote.deliveryFee, quote.currency)} />}
              {quote.serviceFee > 0 && <SummaryRow label="Service fee" value={formatMoney(quote.serviceFee, quote.currency)} />}
              {quote.tax > 0 && <SummaryRow label="Tax" value={formatMoney(quote.tax, quote.currency)} />}
              {quote.discount > 0 && <SummaryRow label="Discount" value={`- ${formatMoney(quote.discount, quote.currency)}`} highlight />}
              <View style={[styles.divider, { backgroundColor: activeTheme.border }]} />
              <View style={styles.summaryRow}>
                <Typography variant="body" weight="bold">Total</Typography>
                <Typography variant="h3" weight="bold" color={activeTheme.primary}>{formatMoney(quote.total, quote.currency)}</Typography>
              </View>
            </>
          ) : null}
        </Card>

        {blockingErrors.map((e) => (
          <View key={e} style={[styles.warning, { backgroundColor: palette.warning + '20' }]}>
            <AlertTriangle size={16} color={palette.warning} />
            <Typography variant="bodySm" style={{ flex: 1 }}>{e}</Typography>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: activeTheme.border, backgroundColor: activeTheme.background }]}>
        <Button
          label={quote ? `Place order · ${formatMoney(quote.total, quote.currency)}` : 'Place order'}
          variant="primary"
          size="lg"
          disabled={!canPlace}
          loading={placeOrder.isPending}
          onPress={handlePlaceOrder}
        />
        {needsAddress && (
          <Typography variant="caption" color={activeTheme.textSecondary} align="center" style={{ marginTop: spacing.xs }}>
            Choose a delivery address to continue
          </Typography>
        )}
      </View>
    </View>
  );
}

const SummaryRow = ({ label, value, muted, highlight }: { label: string; value: string; muted?: boolean; highlight?: boolean }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  return (
    <View style={styles.summaryRow}>
      <Typography variant="bodySm" color={activeTheme.textSecondary}>{muted ? `  ${label}` : label}</Typography>
      <Typography variant="bodySm" weight="semibold" color={highlight ? palette.success : undefined}>{value}</Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 140 },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  promoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summary: { marginTop: spacing.lg, padding: spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  divider: { height: 1, marginVertical: spacing.md },
  warning: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl, borderTopWidth: 1 },
});
