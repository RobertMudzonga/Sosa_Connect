import React, { useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Phone, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useSellerShipments, useShipmentAction, SellerShipment } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

type Tab = 'to_dispatch' | 'in_transit' | 'delivered';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function ShipmentCard({ s }: { s: SellerShipment }) {
  const t = useMarketTheme();
  const action = useShipmentAction();
  const [step, setStep] = useState<'dispatch' | 'deliver' | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [pin, setPin] = useState('');
  const a = s.order.address;

  const run = async (kind: 'pack' | 'dispatch' | 'deliver', body?: Record<string, string | undefined>) => {
    try {
      await action.mutateAsync({ id: s.id, action: kind, body });
      setStep(null);
      setPin('');
    } catch (e) {
      notify('Could not update the parcel', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: s.overdue ? t.error : t.border }]}>
      <View style={styles.rowBetween}>
        <Typography variant="bodySm" weight="bold">{s.reference}</Typography>
        {s.overdue ? <Pill label="Overdue" tone="bad" />
          : s.status === 'DELIVERED' ? <Pill label="Delivered" tone="good" />
          : <Pill label={s.status === 'PACKED' ? 'Packed' : s.status === 'PROCESSING' ? 'To pack' : 'On the way'} tone="info" />}
      </View>
      {s.dispatchBy && !s.dispatchedAt && (
        <Typography variant="caption" color={s.overdue ? t.error : t.textSecondary}>Dispatch by {when(s.dispatchBy)}</Typography>
      )}
      {s.dispatchedAt && (
        <Typography variant="caption" color={t.textSecondary}>
          Sent {when(s.dispatchedAt)} with {s.courierName}{s.trackingNumber ? ` (${s.trackingNumber})` : ''}{s.dispatchedOnTime === false ? ' · late' : ''}
        </Typography>
      )}

      {s.items.map((i) => (
        <View key={i.id} style={styles.rowBetween}>
          <Typography variant="bodySm" style={styles.flex} numberOfLines={2}>{i.quantity} × {i.title}{i.sellerSku ? ` (${i.sellerSku})` : ''}</Typography>
          <Typography variant="caption" color={t.textSecondary}>you get {usd(i.sellerNetUsd)}</Typography>
        </View>
      ))}

      <View style={[styles.address, { backgroundColor: t.surfaceVariant }]}>
        <View style={styles.inline}>
          <MapPin size={14} color={t.textSecondary} />
          <Typography variant="bodySm" weight="semibold">{s.order.recipientName}</Typography>
        </View>
        {s.order.deliveryMode === 'PICKUP' ? (
          <Typography variant="caption" color={t.textSecondary}>Drop at pickup point: {s.order.pickupPoint?.name}, {s.order.pickupPoint?.address}</Typography>
        ) : (
          <>
            <Typography variant="caption" color={t.textSecondary}>{[a.line1, a.line2, a.suburb, a.city].filter(Boolean).join(', ')}</Typography>
            {!!a.landmark && <Typography variant="caption" color={t.textSecondary}>Landmark: {a.landmark}</Typography>}
            {!!a.instructions && <Typography variant="caption" color={t.textSecondary}>Note: {a.instructions}</Typography>}
          </>
        )}
        <TouchableOpacity style={styles.inline} onPress={() => Linking.openURL(`tel:${s.order.recipientPhone}`)}>
          <Phone size={14} color={t.accent} />
          <Typography variant="caption" weight="bold" color={t.accent}>{s.order.recipientPhone}</Typography>
        </TouchableOpacity>
      </View>

      {s.status === 'PROCESSING' && step === null && (
        <View style={styles.row2}>
          <Button label="Mark packed" variant="outline" size="sm" onPress={() => run('pack')} loading={action.isPending} style={styles.flex} />
          <Button label="Dispatch" size="sm" onPress={() => setStep('dispatch')} style={styles.flex} />
        </View>
      )}
      {s.status === 'PACKED' && step === null && <Button label="Dispatch" size="sm" onPress={() => setStep('dispatch')} />}
      {step === 'dispatch' && (
        <View style={styles.form}>
          <Field label="Courier" value={courier} onChangeText={setCourier} placeholder="e.g. Swift, own driver" />
          <Field label="Tracking number (optional)" value={tracking} onChangeText={setTracking} />
          <View style={styles.row2}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setStep(null)} style={styles.flex} />
            <Button label="Confirm dispatch" size="sm" disabled={courier.trim().length < 2} loading={action.isPending}
              onPress={() => run('dispatch', { courierName: courier.trim(), trackingNumber: tracking.trim() || undefined })} style={styles.flex} />
          </View>
        </View>
      )}
      {s.status === 'DISPATCHED' && s.order.deliveryMode === 'DELIVERY' && step === null && (
        <Button label="Confirm delivery" size="sm" onPress={() => setStep('deliver')} />
      )}
      {step === 'deliver' && (
        <View style={styles.form}>
          <Field label="Recipient's collection PIN" value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" maxLength={6} placeholder="6 digits" hint="The recipient got this PIN by SMS. Only hand over the parcel once it matches." />
          <View style={styles.row2}>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setStep(null)} style={styles.flex} />
            <Button label="Confirm delivery" size="sm" disabled={pin.length !== 6} loading={action.isPending} onPress={() => run('deliver', { pin })} style={styles.flex} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function MerchantShipments() {
  const t = useMarketTheme();
  const [tab, setTab] = useState<Tab>('to_dispatch');
  const { data, isLoading, refetch, isRefetching } = useSellerShipments(tab);

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <View style={styles.tabs}>
        <Tabs value={tab} onChange={setTab} options={[{ value: 'to_dispatch', label: 'To dispatch' }, { value: 'in_transit', label: 'On the way' }, { value: 'delivered', label: 'Delivered' }]} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => <ShipmentCard s={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={t.accent} /> : (
              <Typography variant="bodySm" color={t.textSecondary} align="center">
                {tab === 'to_dispatch' ? 'Nothing to ship right now. Orders for products you ship yourself appear here.' : 'No parcels here yet.'}
              </Typography>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { padding: spacing.lg, paddingBottom: 0 },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  address: { borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  row2: { flexDirection: 'row', gap: spacing.sm },
  form: { gap: spacing.sm },
  empty: { marginTop: 80, paddingHorizontal: spacing.lg },
});
