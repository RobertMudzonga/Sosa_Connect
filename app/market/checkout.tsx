import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MapPin, Store, Check, Gift, Zap, PackageCheck, Truck, Wallet, Smartphone, CreditCard, Banknote, AlertTriangle, PenLine } from 'lucide-react-native';
import { CoordinateField } from '@/src/components/map/CoordinateField';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { AddressForm } from '@/src/components/features/AddressForm';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMarketCartStore } from '@/src/store/market-cart-store';
import { useBuyerLocation, useMarketStore } from '@/src/store/market-store';
import { useAuthStore } from '@/src/store/auth-store';
import { useAddresses, formatAddress } from '@/src/hooks/useAddresses';
import { useCities } from '@/src/hooks/useCatalog';
import {
  useMarketQuote, usePickupPoints, usePlaceMarketOrder, useWallet, PaymentMethod, PayCurrency, QuoteBody, Fulfilment, DepositMethod, Quote,
} from '@/src/hooks/useMarket';
import { formatPrice, currencyLabel, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const ZW_MOBILE = /^\+2637\d{8}$/;
const MOBILE_METHODS: PaymentMethod[] = ['ECOCASH', 'ONEMONEY', 'INNBUCKS'];

export function etaLabel(min: number | null, max: number | null) {
  if (min === null || max === null) return '';
  if (max === 0) return 'Arrives today';
  if (min === 1 && max === 1) return 'Arrives tomorrow';
  return min === max ? `Arrives in ${min} days` : `Arrives in ${min}–${max} days`;
}

/** "~35 min", "~2 h", or when a closed store opens */
export function storeEtaLabel(etaMinutes: number | null, opensAt: string | null) {
  if (opensAt) {
    const at = new Date(opensAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return `Store closed now · packed when it opens (${at})`;
  }
  if (etaMinutes === null) return '';
  if (etaMinutes < 90) return `Delivered in ~${Math.max(15, Math.round(etaMinutes / 5) * 5)} min`;
  return `Delivered in ~${Math.round(etaMinutes / 30) / 2} h`;
}

function parcelLine(sh: Quote['shipments'][number], currency: PayCurrency) {
  const parts: string[] = [];
  if (sh.storeBranchId) {
    parts.push(sh.tier === 'PICKUP_POINT' ? 'Driver drops it at the pickup point' : storeEtaLabel(sh.etaMinutes, sh.opensAt));
    if (sh.distanceKm !== null) parts.push(`${sh.distanceKm.toFixed(1)} km`);
    if (sh.vehicleClass && sh.vehicleClass !== 'BIKE') parts.push(sh.vehicleClass === 'CAR' ? 'by car' : 'by bakkie');
  } else if (sh.tierLabel) {
    parts.push(sh.tierLabel, etaLabel(sh.etaMinDays, sh.etaMaxDays));
  }
  if (sh.feeWaived && sh.baseFee) parts.push(`${formatPrice(sh.baseFee, currency)} waived`);
  return parts.filter(Boolean).join(' · ');
}

const METHOD_ICONS: Record<PaymentMethod, typeof Wallet> = {
  ECOCASH: Smartphone, ONEMONEY: Smartphone, INNBUCKS: Smartphone, ZIMSWITCH: CreditCard, CARD: CreditCard, WALLET: Wallet, CASH: Banknote,
};

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  const t = useMarketTheme();
  return (
    <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.sectionHeader}>
        <Typography variant="body" weight="bold">{title}</Typography>
        {right}
      </View>
      {children}
    </View>
  );
}

function Choice({ selected, onPress, children, disabled }: { selected: boolean; onPress: () => void; children: React.ReactNode; disabled?: boolean }) {
  const t = useMarketTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[styles.choice, { borderColor: selected ? t.accent : t.border, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.radio, { borderColor: selected ? t.accent : t.textSecondary }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: t.accent }]} />}
      </View>
      <View style={styles.flex}>{children}</View>
    </TouchableOpacity>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useMarketTheme();
  return (
    <View style={[styles.segment, { backgroundColor: t.surfaceVariant }]}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.value }}
          style={[styles.segmentBtn, value === o.value && { backgroundColor: t.primary }]}
        >
          <Typography variant="bodySm" weight="semibold" style={{ color: value === o.value ? '#fff' : t.textSecondary }}>{o.label}</Typography>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MarketCheckoutScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { lines, removeOffers } = useMarketCartStore();
  const { currency: displayCurrency, city: marketCity } = useMarketStore();
  const buyerLocation = useBuyerLocation();
  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const { data: cities } = useCities();
  const { data: wallet } = useWallet(!!user);

  const [mode, setMode] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  /** SAVED: one of my addresses; ONE_OFF: typed for this order only (e.g. a gift) */
  const [addressMode, setAddressMode] = useState<'SAVED' | 'ONE_OFF'>('SAVED');
  const [oneOffCity, setOneOffCity] = useState<string | null>(null);
  const [oneOffSuburb, setOneOffSuburb] = useState<string | null>(null);
  const [oneOffLine1, setOneOffLine1] = useState('');
  const [oneOffLandmark, setOneOffLandmark] = useState('');
  const [oneOffPin, setOneOffPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupCity, setPickupCity] = useState<string | undefined>(marketCity?.slug);
  // Same town as the shopping location: sort pickup points by distance from the buyer
  const pickupLocation = pickupCity && pickupCity === buyerLocation.city ? buyerLocation : pickupCity ? { city: pickupCity } : undefined;
  const { data: points, isLoading: pointsLoading } = usePickupPoints(pickupLocation);
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('ECOCASH');
  const [pickupPointId, setPickupPointId] = useState<string | null>(null);
  const [gift, setGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('+263');
  const [recipientId, setRecipientId] = useState('');
  const [speed, setSpeed] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [currency, setCurrency] = useState<PayCurrency>(displayCurrency);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [payPhone, setPayPhone] = useState(user?.phone ?? '+263');
  const place = usePlaceMarketOrder();

  // Start on the default address once addresses load
  useEffect(() => {
    if (!addressId && addresses?.length) setAddressId((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
    if (addresses && addresses.length === 0) setAddingAddress(true);
  }, [addresses, addressId]);

  const oneOffValid = !!oneOffCity && oneOffLine1.trim().length >= 3 && oneOffLandmark.trim().length >= 3;
  let fulfilment: Fulfilment | undefined;
  if (mode === 'PICKUP') fulfilment = pickupPointId ? { mode, pickupPointId } : undefined;
  else if (addressMode === 'ONE_OFF') {
    fulfilment = oneOffValid
      ? { mode, address: { cityId: oneOffCity!, suburbId: oneOffSuburb ?? undefined, line1: oneOffLine1.trim(), landmark: oneOffLandmark.trim(), ...(oneOffPin ?? {}) } }
      : undefined;
  } else fulfilment = addressId ? { mode, addressId } : undefined;
  const fulfilmentKey = JSON.stringify(fulfilment ?? null);
  const recipientValid = recipientName.trim().length >= 2 && ZW_MOBILE.test(recipientPhone);
  const recipient = gift && recipientValid
    ? { name: recipientName.trim(), phone: recipientPhone, idNumber: recipientId.trim() || undefined }
    : undefined;

  const body: QuoteBody = useMemo(() => ({
    items: lines.map((l) => ({ offerId: l.offerId, quantity: l.quantity })),
    fulfilment,
    speed,
    paymentCurrency: currency,
    paymentMethod: method ?? undefined,
    recipient,
  }), [lines, fulfilmentKey, speed, currency, method, recipient?.name, recipient?.phone, recipient?.idNumber]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: quote, error: quoteError, isFetching } = useMarketQuote(lines.length ? body : null);

  // Drop choices the latest quote no longer allows
  useEffect(() => {
    if (!quote) return;
    if (method && !quote.paymentMethods.find((m) => m.method === method)?.available) setMethod(null);
    if (speed === 'EXPRESS' && !quote.express.available) setSpeed('STANDARD');
  }, [quote, method, speed]);

  if (!lines.length) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: 'Checkout' }} />
        <Typography variant="body" color={t.textSecondary}>Your cart is empty.</Typography>
        <Button label="Back to shop" variant="outline" onPress={() => router.replace('/(tabs)/search')} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const deposit = method === 'CASH' ? quote?.totals.codDeposit ?? null : null;
  const depositDue = !!deposit && deposit.usd > 0;
  const needsPhone = (!!method && MOBILE_METHODS.includes(method)) || depositDue;
  const selfCanReceive = !!user?.phoneVerified && !!user.phone && ZW_MOBILE.test(user.phone);
  const blockers: string[] = [];
  if (!fulfilment) {
    blockers.push(mode === 'PICKUP' ? 'Choose a pickup point'
      : addressMode === 'ONE_OFF' ? 'Enter the town, street and a landmark'
      : 'Choose a delivery address');
  }
  if (!gift && !selfCanReceive) blockers.push('Verify your phone number, or send to someone else');
  if (gift && !recipientValid) blockers.push("Enter the recipient's name and Zimbabwe mobile number");
  if (!method) blockers.push('Choose how to pay');
  if (needsPhone && !ZW_MOBILE.test(payPhone)) blockers.push('Enter the mobile number to charge');
  const undeliverable = quote?.issues.find((i) => i.type === 'UNDELIVERABLE');
  if (undeliverable) blockers.push(`${undeliverable.message}. Remove it from your cart or choose another address.`);
  else if (quote?.issues.length) blockers.push('Some items changed; update your cart');
  if (quoteError) blockers.push(getErrorMessage(quoteError));

  const due = quote?.amountDue;
  // amountDue is already in the payment currency, so it fills whichever field formatPrice reads
  let placeLabel = 'Place order';
  if (depositDue) placeLabel = `Pay ${formatPrice(deposit!, currency)} delivery & place order`;
  else if (due && quote?.totals.deliveryPriced && method !== 'CASH') placeLabel = `Place order · ${formatPrice({ usd: due.amount, zwg: due.amount }, currency)}`;

  const onPlace = async () => {
    if (!quote || !fulfilment || !method) return;
    try {
      const result = await place.mutateAsync({
        ...body,
        fulfilment,
        paymentMethod: method,
        paymentCurrency: currency,
        paymentPhone: needsPhone ? payPhone : undefined,
        depositMethod: depositDue ? depositMethod : undefined,
        expectedTotalUsd: quote.totals.total.usd,
      });
      removeOffers(quote.lines.map((l) => l.offerId));
      if (result.payment?.redirectUrl) await WebBrowser.openBrowserAsync(result.payment.redirectUrl).catch(() => {});
      router.replace({ pathname: '/market/orders/[id]', params: { id: result.order.id } });
    } catch (error: any) {
      const conflict = error?.response?.status === 409;
      notify(conflict ? 'Your order changed' : 'Could not place your order', getErrorMessage(error));
    }
  };

  const cityOptions = (cities ?? []).map((c) => ({ value: c.slug, label: c.name, hint: c.province }));

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 1. Delivery */}
        <Section title="How do you want it?">
          <Segmented value={mode} onChange={setMode} options={[{ value: 'DELIVERY', label: 'Deliver to me' }, { value: 'PICKUP', label: 'Collect' }]} />
          {mode === 'DELIVERY' ? (
            <View style={styles.gapSm}>
              {addressesLoading && <ActivityIndicator color={t.accent} />}
              {(addresses ?? []).map((a) => (
                <Choice key={a.id} selected={addressMode === 'SAVED' && addressId === a.id} onPress={() => { setAddressId(a.id); setAddressMode('SAVED'); setAddingAddress(false); }}>
                  <View style={styles.inline}>
                    <MapPin size={14} color={t.textSecondary} />
                    <Typography variant="bodySm" weight="bold">{a.label}</Typography>
                  </View>
                  <Typography variant="bodySm" color={t.textSecondary}>{formatAddress(a)}</Typography>
                  {!!a.landmark && <Typography variant="caption" color={t.textSecondary}>Landmark: {a.landmark}</Typography>}
                </Choice>
              ))}
              {addingAddress ? (
                <View style={[styles.addressForm, { borderColor: t.border }]}>
                  <AddressForm
                    onSaved={(a) => { setAddressId(a.id); setAddingAddress(false); }}
                    onCancel={addresses?.length ? () => setAddingAddress(false) : undefined}
                  />
                </View>
              ) : (
                <Button label="Add a new address" variant="ghost" size="sm" onPress={() => setAddingAddress(true)} />
              )}
              <Choice selected={addressMode === 'ONE_OFF'} onPress={() => { setAddressMode('ONE_OFF'); setAddingAddress(false); }}>
                <View style={styles.inline}>
                  <PenLine size={14} color={t.textSecondary} />
                  <Typography variant="bodySm" weight="bold">Another address, this order only</Typography>
                </View>
                <Typography variant="caption" color={t.textSecondary}>Sending a gift? Type where it should go; we won't save it.</Typography>
              </Choice>
              {addressMode === 'ONE_OFF' && (
                <View style={[styles.addressForm, styles.gapSm, { borderColor: t.border }]}>
                  <OptionPicker label="Town" placeholder="Choose a town" value={oneOffCity}
                    options={(cities ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.province }))}
                    onChange={(v) => { setOneOffCity(v); setOneOffSuburb(null); }} />
                  {!!cities?.find((c) => c.id === oneOffCity)?.suburbs.length && (
                    <OptionPicker label="Suburb" placeholder="Choose a suburb" value={oneOffSuburb}
                      options={cities!.find((c) => c.id === oneOffCity)!.suburbs.map((sb) => ({ value: sb.id, label: sb.name }))}
                      onChange={setOneOffSuburb} />
                  )}
                  <TextInput value={oneOffLine1} onChangeText={setOneOffLine1} placeholder="House number and street" placeholderTextColor={t.textSecondary}
                    style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Street address" />
                  <TextInput value={oneOffLandmark} onChangeText={setOneOffLandmark} placeholder="Landmark, e.g. opposite the blue church" placeholderTextColor={t.textSecondary}
                    style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Landmark" />
                  <CoordinateField
                    label="Pin the gate (optional)"
                    value={oneOffPin}
                    onChange={setOneOffPin}
                    centre={(() => {
                      const c = cities?.find((x) => x.id === oneOffCity);
                      return c?.lat != null && c.lng != null ? { lat: c.lat, lng: c.lng } : null;
                    })()}
                    hint="A pin gives an exact delivery fee and gets the driver to the right gate"
                    optional
                  />
                  <Typography variant="caption" color={t.textSecondary}>Drivers use the landmark to find the gate; the recipient gets a call if they are lost.</Typography>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.gapSm}>
              <OptionPicker label="Town" placeholder="Choose a town" value={pickupCity} options={cityOptions} onChange={(c) => { setPickupCity(c); setPickupPointId(null); }} />
              {pointsLoading && <ActivityIndicator color={t.accent} />}
              {pickupCity && points?.length === 0 && (
                <Typography variant="bodySm" color={t.textSecondary}>No pickup points in this town yet. Choose another town or home delivery.</Typography>
              )}
              {(points ?? []).map((p) => (
                <Choice key={p.id} selected={pickupPointId === p.id} onPress={() => { if (!p.isFull) setPickupPointId(p.id); }}>
                  <View style={styles.inline}>
                    <Store size={14} color={t.textSecondary} />
                    <Typography variant="bodySm" weight="bold">{p.name}</Typography>
                  </View>
                  <Typography variant="caption" color={t.textSecondary}>{[p.address, p.suburb].filter(Boolean).join(', ')}</Typography>
                  {!!p.landmark && <Typography variant="caption" color={t.textSecondary}>{p.landmark}</Typography>}
                  {!!p.operatingHours && <Typography variant="caption" color={t.textSecondary}>Open {p.operatingHours}</Typography>}
                  {p.distanceKm !== null && <Typography variant="caption" color={t.textSecondary}>{p.distanceKm} km from you</Typography>}
                  {p.isFull && <Typography variant="caption" color={t.warning}>Full for today: choose another point</Typography>}
                </Choice>
              ))}
              <Typography variant="caption" color={t.textSecondary}>Cheaper than door delivery: drivers drop several orders at once. Collect with the 6-digit PIN we text you.</Typography>
            </View>
          )}
        </Section>

        {/* 2. Recipient */}
        <Section title="Who's receiving it?">
          <Choice selected={!gift} onPress={() => setGift(false)}>
            <Typography variant="bodySm" weight="bold">Me</Typography>
            <Typography variant="caption" color={t.textSecondary}>
              {selfCanReceive ? `${user?.fullName ?? ''} · ${user?.phone}` : 'Verify your phone number to receive orders yourself'}
            </Typography>
            {!selfCanReceive && !gift && (
              <Button label="Verify phone" size="sm" variant="outline" style={styles.inlineBtn}
                onPress={() => router.push({ pathname: '/verify-phone', params: { returnTo: 'market-checkout' } })} />
            )}
          </Choice>
          <Choice selected={gift} onPress={() => setGift(true)}>
            <View style={styles.inline}>
              <Gift size={14} color={t.textSecondary} />
              <Typography variant="bodySm" weight="bold">Someone else</Typography>
            </View>
            <Typography variant="caption" color={t.textSecondary}>Buying from abroad? Send it to family in Zimbabwe.</Typography>
          </Choice>
          {gift && (
            <View style={styles.gapSm}>
              <TextInput value={recipientName} onChangeText={setRecipientName} placeholder="Recipient's full name" placeholderTextColor={t.textSecondary}
                style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Recipient name" />
              <TextInput value={recipientPhone} onChangeText={setRecipientPhone} placeholder="+2637XXXXXXXX" keyboardType="phone-pad" placeholderTextColor={t.textSecondary}
                style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Recipient mobile number" />
              <TextInput value={recipientId} onChangeText={setRecipientId} placeholder="Recipient's ID number (optional)" placeholderTextColor={t.textSecondary}
                style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Recipient ID number" />
              <Typography variant="caption" color={t.textSecondary}>
                We text them a collection PIN. They show the PIN (and ID, if given) when they receive it.
              </Typography>
            </View>
          )}
        </Section>

        {/* 3. Parcels and speed */}
        <Section title="Your parcels" right={isFetching ? <ActivityIndicator size="small" color={t.accent} /> : undefined}>
          {mode === 'DELIVERY' && quote?.shipments.some((sh) => sh.sourceType === 'PLATFORM_FULFILLED') && (
            <View style={styles.gapSm}>
              <Choice selected={speed === 'STANDARD'} onPress={() => setSpeed('STANDARD')}>
                <Typography variant="bodySm" weight="bold">Standard</Typography>
              </Choice>
              <Choice selected={speed === 'EXPRESS'} onPress={() => setSpeed('EXPRESS')} disabled={!quote.express.available}>
                <View style={styles.inline}>
                  <Zap size={14} color={t.warning} />
                  <Typography variant="bodySm" weight="bold">Same-day</Typography>
                </View>
                <Typography variant="caption" color={t.textSecondary}>
                  {quote.express.available ? 'For items shipped by Kuwana in your city' : quote.express.reason}
                </Typography>
              </Choice>
            </View>
          )}
          {quote?.shipments.map((sh, i) => (
            <View key={sh.key} style={[styles.parcel, { borderColor: t.border }]}>
              <View style={styles.rowBetween}>
                <View style={[styles.inline, styles.flex]}>
                  {sh.undeliverable ? <AlertTriangle size={15} color={t.error} />
                    : sh.sourceType === 'PLATFORM_FULFILLED' ? <PackageCheck size={15} color={t.accent} /> : <Truck size={15} color={t.textSecondary} />}
                  <Typography variant="bodySm" weight="bold" style={styles.flex}>Parcel {i + 1} · {sh.label}</Typography>
                </View>
                {sh.fee && (
                  sh.fee.usd === 0
                    ? <Typography variant="bodySm" weight="bold" color={t.success}>Free</Typography>
                    : <Typography variant="bodySm" weight="bold">{formatPrice(sh.fee, currency)}</Typography>
                )}
              </View>
              {sh.undeliverable ? (
                <Typography variant="caption" color={t.error}>{sh.undeliverable}</Typography>
              ) : (
                !!parcelLine(sh, currency) && <Typography variant="caption" color={t.textSecondary}>{parcelLine(sh, currency)}</Typography>
              )}
              {sh.items.map((it) => (
                <Typography key={it.offerId} variant="caption" color={t.textSecondary} numberOfLines={1}>{it.quantity} × {it.title}</Typography>
              ))}
            </View>
          ))}
          {quote && !quote.totals.deliveryPriced && (
            <Typography variant="caption" color={t.textSecondary}>{"Choose where it's going to see delivery fees."}</Typography>
          )}
        </Section>

        {/* 4. Payment */}
        <Section
          title="Pay in"
          right={
            <View style={styles.currencyToggle}>
              <Segmented value={currency} onChange={setCurrency} options={[{ value: 'USD', label: 'USD' }, { value: 'ZWG', label: 'ZiG' }]} />
            </View>
          }
        >
          {currency === 'ZWG' && quote?.exchangeRate && (
            <Typography variant="caption" color={t.textSecondary}>
              $1 = ZiG {quote.exchangeRate.rate.toFixed(2)}. The rate is fixed when you place the order.
            </Typography>
          )}
          {quote?.paymentMethods.map((m) => {
            const Icon = METHOD_ICONS[m.method];
            const extra = m.method === 'WALLET' && wallet ? ` · ${formatPrice(wallet.balance, 'USD')} available` : '';
            return (
              <Choice key={m.method} selected={method === m.method} onPress={() => setMethod(m.method)} disabled={!m.available}>
                <View style={styles.inline}>
                  <Icon size={15} color={t.textSecondary} />
                  <Typography variant="bodySm" weight="bold">{m.label}</Typography>
                </View>
                <Typography variant="caption" color={t.textSecondary}>
                  {m.available
                    ? m.method === 'CASH'
                      ? depositDue
                        ? `Pay ${formatPrice(deposit!, currency)} delivery now (non-refundable), then ${formatPrice(quote.totals.cashOnDelivery!, currency)} cash to the driver.`
                        : 'Pay the goods in cash at the door. The delivery fee is paid upfront by EcoCash or InnBucks.'
                      : m.method === 'CARD' || m.method === 'ZIMSWITCH' ? "You'll finish on a secure payment page."
                      : m.method === 'WALLET' ? `Store credit${extra}`
                      : 'Approve the payment on your phone.'
                    : m.reason}
                </Typography>
              </Choice>
            );
          })}
          {depositDue && (
            <View style={styles.gapSm}>
              <Typography variant="bodySm" weight="semibold">Pay the delivery fee with</Typography>
              <Segmented value={depositMethod} onChange={setDepositMethod} options={[{ value: 'ECOCASH', label: 'EcoCash' }, { value: 'INNBUCKS', label: 'InnBucks' }]} />
            </View>
          )}
          {needsPhone && (
            <TextInput value={payPhone} onChangeText={setPayPhone} placeholder="+2637XXXXXXXX" keyboardType="phone-pad" placeholderTextColor={t.textSecondary}
              style={[styles.input, { backgroundColor: t.surfaceVariant, color: t.text }]} accessibilityLabel="Mobile number to charge" />
          )}
        </Section>

        {/* 5. Summary */}
        {quote && (
          <Section title="Summary">
            <View style={styles.rowBetween}>
              <Typography variant="bodySm" color={t.textSecondary}>Items ({quote.lines.reduce((n, l) => n + l.quantity, 0)})</Typography>
              <Typography variant="bodySm">{formatPrice(quote.totals.itemsSubtotal, currency)}</Typography>
            </View>
            <View style={styles.rowBetween}>
              <Typography variant="bodySm" color={t.textSecondary}>Delivery</Typography>
              <Typography variant="bodySm">
                {!quote.totals.deliveryPriced ? '—' : quote.totals.delivery.usd === 0 ? 'Free' : formatPrice(quote.totals.delivery, currency)}
              </Typography>
            </View>
            {quote.totals.sellerShipping.usd > 0 && (
              <View style={styles.rowBetween}>
                <Typography variant="bodySm" color={t.textSecondary}>Seller shipping</Typography>
                <Typography variant="bodySm">{formatPrice(quote.totals.sellerShipping, currency)}</Typography>
              </View>
            )}
            {quote.totals.codFee.usd > 0 && (
              <View style={styles.rowBetween}>
                <Typography variant="bodySm" color={t.textSecondary}>Cash on delivery fee</Typography>
                <Typography variant="bodySm">{formatPrice(quote.totals.codFee, currency)}</Typography>
              </View>
            )}
            <View style={[styles.rowBetween, styles.totalRow, { borderColor: t.border }]}>
              <Typography variant="body" weight="bold">Total ({currencyLabel(currency)})</Typography>
              <Typography variant="h3" weight="bold">{formatPrice(quote.totals.total, currency)}</Typography>
            </View>
            <Typography variant="caption" color={t.textSecondary} align="right">
              ≈ {formatPrice(quote.totals.total, currency === 'USD' ? 'ZWG' : 'USD')}
            </Typography>
            {depositDue && quote.totals.cashOnDelivery && (
              <View style={[styles.gapSm, styles.totalRow, { borderColor: t.border }]}>
                <View style={styles.rowBetween}>
                  <Typography variant="bodySm" weight="semibold">Pay now ({depositMethod === 'ECOCASH' ? 'EcoCash' : 'InnBucks'})</Typography>
                  <Typography variant="bodySm" weight="semibold">{formatPrice(deposit!, currency)}</Typography>
                </View>
                <View style={styles.rowBetween}>
                  <Typography variant="bodySm" weight="semibold">Cash to the driver</Typography>
                  <Typography variant="bodySm" weight="semibold">{formatPrice(quote.totals.cashOnDelivery, currency)}</Typography>
                </View>
              </View>
            )}
          </Section>
        )}

        {blockers.length > 0 && (
          <Typography variant="caption" color={t.textSecondary} align="center" style={styles.blocker}>{blockers[0]}</Typography>
        )}
        <Button
          label={placeLabel}
          size="lg"
          loading={place.isPending}
          disabled={blockers.length > 0 || !quote || isFetching}
          onPress={onPlace}
          style={styles.placeBtn}
        />
        <View style={styles.inlineCenter}>
          <Check size={12} color={t.textSecondary} />
          <Typography variant="caption" color={t.textSecondary}>Stock is held for you while you pay.</Typography>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  section: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  gapSm: { gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  inlineBtn: { alignSelf: 'flex-start', marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  choice: { flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'flex-start' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: radius.md, gap: 3 },
  currencyToggle: { width: 140 },
  segmentBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: 'center' },
  addressForm: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  input: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 11, fontSize: 15 },
  parcel: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: 2 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, marginTop: 4 },
  blocker: { marginTop: spacing.sm },
  placeBtn: { marginTop: spacing.xs },
});
