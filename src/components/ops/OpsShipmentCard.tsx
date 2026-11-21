import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MapPin, Phone, Banknote } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Pill } from '../merchant/ui';
import { useMarketTheme } from '../marketplace/useMarketTheme';
import type { OpsShipment } from '../../hooks/useOps';
import { radius, spacing } from '../../theme/spacing';

const STATUS: Record<string, { label: string; tone: 'info' | 'warn' | 'good' | 'bad' }> = {
  PROCESSING: { label: 'To pick', tone: 'warn' },
  PACKED: { label: 'Packed', tone: 'info' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'info' },
  DISPATCHED: { label: 'On its way', tone: 'info' },
  READY_FOR_COLLECTION: { label: 'Ready to collect', tone: 'good' },
  DELIVERED: { label: 'Delivered', tone: 'good' },
  COLLECTED: { label: 'Collected', tone: 'good' },
  RETURNED: { label: 'Returned to stock', tone: 'bad' },
};

export const money = (amount: number, currency: 'USD' | 'ZWG') =>
  currency === 'USD' ? `$${amount.toFixed(2)}` : `ZiG ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Parcel summary for staff: where it goes, who receives it, what's inside, cash to collect */
export function OpsShipmentCard({ s, showBins, children }: { s: OpsShipment; showBins?: boolean; children?: React.ReactNode }) {
  const t = useMarketTheme();
  const a = s.order.address;
  const st = STATUS[s.status] ?? { label: s.status, tone: 'info' as const };
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.rowBetween}>
        <Typography variant="bodySm" weight="bold">{s.reference}</Typography>
        <Pill label={st.label} tone={st.tone} />
      </View>
      <Typography variant="caption" color={t.textSecondary}>
        {s.order.deliveryMode === 'PICKUP' ? `Pickup point · ${s.order.pickupPoint?.name}` : `${s.tierLabel} · ${s.order.city}`}
        {s.driver ? ` · ${s.driver.name}` : ''}{s.courierName && !s.driver ? ` · ${s.courierName}` : ''}{s.trackingNumber ? ` (${s.trackingNumber})` : ''}
      </Typography>
      {!!s.lastAttemptNote && <Typography variant="caption" color={t.warning}>{s.lastAttemptNote}</Typography>}

      {s.items.map((i) => (
        <View key={i.id} style={styles.rowBetween}>
          <Typography variant="bodySm" style={styles.flex} numberOfLines={2}>{i.quantity} × {i.title}</Typography>
          {showBins && <Typography variant="caption" weight="bold" color={i.bin ? t.accent : t.textSecondary}>{i.bin ?? 'no bin'}</Typography>}
        </View>
      ))}

      <View style={[styles.box, { backgroundColor: t.surfaceVariant }]}>
        <View style={styles.inline}>
          <MapPin size={14} color={t.textSecondary} />
          <Typography variant="bodySm" weight="semibold">{s.order.recipientName}</Typography>
        </View>
        {s.order.deliveryMode === 'PICKUP' ? (
          <Typography variant="caption" color={t.textSecondary}>{s.order.pickupPoint?.name}, {s.order.pickupPoint?.address}</Typography>
        ) : (
          <>
            <Typography variant="caption" color={t.textSecondary}>{[a.line1, a.line2, a.suburb, s.order.city].filter(Boolean).join(', ')}</Typography>
            {!!a.landmark && <Typography variant="caption" color={t.textSecondary}>Landmark: {a.landmark}</Typography>}
          </>
        )}
        <TouchableOpacity style={styles.inline} onPress={() => Linking.openURL(`tel:${s.order.recipientPhone}`)}>
          <Phone size={14} color={t.accent} />
          <Typography variant="caption" weight="bold" color={t.accent}>{s.order.recipientPhone}</Typography>
        </TouchableOpacity>
      </View>

      {s.cashToCollect && (
        <View style={styles.inline}>
          <Banknote size={16} color={t.warning} />
          <Typography variant="bodySm" weight="bold" color={t.warning}>
            {s.cashCollected !== null ? `Cash collected ${money(s.cashCollected, s.cashToCollect.currency)}` : `Collect ${money(s.cashToCollect.amount, s.cashToCollect.currency)} cash`}
          </Typography>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  box: { borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
});
