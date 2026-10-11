import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check, Phone, MapPin, Star, Truck, CreditCard, RotateCcw } from 'lucide-react-native';
import AppMap from '@/components/Map';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { TextField } from '@/src/components/common/TextField';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOrder, useCancelOrder, useSubmitReview, useRetryPayment } from '@/src/hooks/useOrders';
import { formatAddress } from '@/src/hooks/useAddresses';
import { useCartStore } from '@/src/store/cart-store';
import {
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, BUYER_CANCELLABLE, getStatusColor, getTimelineSteps,
} from '@/src/utils/orderStatus';
import { formatMoney, formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: order, isLoading, refetch } = useOrder(id);
  const cancelOrder = useCancelOrder();
  const submitReview = useSubmitReview();
  const retryPayment = useRetryPayment();
  const addItem = useCartStore((s) => s.addItem);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (isLoading || !order) {
    return (
      <View style={[styles.center, { backgroundColor: activeTheme.background }]}>
        {isLoading ? <ActivityIndicator color={activeTheme.primary} /> : <Typography color={activeTheme.textSecondary}>Order not found.</Typography>}
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const steps = getTimelineSteps(order.fulfilment);
  const currentStep = steps.indexOf(order.status === 'READY' && order.fulfilment === 'DELIVERY' ? 'PREPARING' : order.status);
  const isTerminalFailure = ['CANCELLED', 'REJECTED', 'REFUNDED'].includes(order.status);
  const isComplete = order.status === 'DELIVERED' || order.status === 'COLLECTED';
  const paymentPending = order.paymentMethod !== 'CASH' && order.paymentStatus === 'PENDING' && !isTerminalFailure;
  const paymentFailed = order.paymentStatus === 'FAILED' && !isTerminalFailure;
  const stepTime = (status: string) => order.statusHistory?.find((h) => h.status === status)?.at;

  const handleCancel = async () => {
    const confirmed = await confirmAction('Cancel order?', 'The seller will be notified. Any payment will be refunded.', 'Cancel order', true);
    if (!confirmed) return;
    try {
      await cancelOrder.mutateAsync({ id: order.id, reason: 'Cancelled by customer' });
    } catch (error) {
      notify('Could not cancel', getErrorMessage(error));
    }
  };

  const handleRetryPayment = async () => {
    try {
      const payment = await retryPayment.mutateAsync({ orderId: order.id, paymentMethod: order.paymentMethod });
      if (payment.redirectUrl) await WebBrowser.openBrowserAsync(payment.redirectUrl);
      else if (payment.instructions) notify('Complete your payment', payment.instructions);
      refetch();
    } catch (error) {
      notify('Payment failed', getErrorMessage(error));
    }
  };

  const handleReorder = () => {
    for (const item of order.items) {
      addItem({
        serviceId: item.serviceId,
        title: item.title,
        price: item.unitPrice - item.options.reduce((sum, o) => sum + o.price, 0),
        currency: order.currency,
        providerId: order.provider.id,
        providerName: order.provider.businessName,
        imageUrl: item.imageUrl,
        options: item.options.map((o) => ({ ...o, groupName: o.groupName ?? '' })),
        notes: item.notes,
      }, item.quantity);
    }
    router.push('/cart');
  };

  const handleReview = async () => {
    if (!rating) {
      notify('Choose a rating', 'Tap the stars to rate your order.');
      return;
    }
    try {
      await submitReview.mutateAsync({ orderId: order.id, rating, comment: comment.trim() || undefined });
      notify('Thank you!', 'Your review has been posted.');
    } catch (error) {
      notify('Could not post review', getErrorMessage(error));
    }
  };

  const driverLocation = order.driver?.lat && order.driver?.lng ? { latitude: order.driver.lat, longitude: order.driver.lng } : null;

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <Stack.Screen options={{ title: `Order #${order.reference}` }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="h2" weight="bold">{order.provider.businessName}</Typography>
        <Typography variant="caption" color={activeTheme.textSecondary}>Placed {formatDateTime(order.createdAt)}</Typography>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Typography variant="bodySm" weight="bold" style={{ color: statusColor }}>{ORDER_STATUS_LABELS[order.status]}</Typography>
        </View>
        {!!order.cancelReason && isTerminalFailure && (
          <Typography variant="bodySm" color={activeTheme.textSecondary}>Reason: {order.cancelReason}</Typography>
        )}

        {paymentPending && (
          <View style={[styles.banner, { backgroundColor: palette.warning + '20' }]}>
            <ActivityIndicator size="small" color={palette.warning} />
            <Typography variant="bodySm" style={{ flex: 1 }}>
              Waiting for your {PAYMENT_METHOD_LABELS[order.paymentMethod]} payment to be confirmed…
            </Typography>
          </View>
        )}
        {paymentFailed && (
          <View style={[styles.banner, { backgroundColor: palette.danger + '20' }]}>
            <CreditCard size={16} color={palette.danger} />
            <Typography variant="bodySm" style={{ flex: 1 }}>Payment failed. Your order will not be sent until it is paid.</Typography>
            <Button label="Retry" size="sm" variant="danger" loading={retryPayment.isPending} onPress={handleRetryPayment} />
          </View>
        )}

        {/* Timeline */}
        {!isTerminalFailure && (
          <Card variant="flat" style={styles.section}>
            {steps.map((step, index) => {
              const done = currentStep >= index;
              const at = stepTime(step);
              return (
                <View key={step} style={styles.step}>
                  <View style={styles.stepMarker}>
                    <View style={[styles.stepDot, { backgroundColor: done ? activeTheme.primary : activeTheme.border }]}>
                      {done && <Check size={12} color="#fff" />}
                    </View>
                    {index < steps.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: currentStep > index ? activeTheme.primary : activeTheme.border }]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingBottom: spacing.md }}>
                    <Typography variant="body" weight={currentStep === index ? 'bold' : 'regular'} color={done ? undefined : activeTheme.textSecondary}>
                      {ORDER_STATUS_LABELS[step]}
                    </Typography>
                    {!!at && <Typography variant="caption" color={activeTheme.textSecondary}>{formatDateTime(at)}</Typography>}
                  </View>
                </View>
              );
            })}
            {!!order.estimatedReadyAt && !isComplete && (
              <Typography variant="caption" color={activeTheme.textSecondary}>
                Estimated {order.fulfilment === 'DELIVERY' ? 'arrival' : 'ready'}: {formatDateTime(order.estimatedReadyAt)}
              </Typography>
            )}
          </Card>
        )}

        {/* Driver */}
        {order.driver && !isComplete && !isTerminalFailure && (
          <Card variant="outlined" style={styles.section}>
            <View style={styles.inline}>
              <Truck size={18} color={activeTheme.primary} />
              <Typography variant="body" weight="bold" style={{ flex: 1 }}>{order.driver.fullName} is delivering your order</Typography>
              {!!order.driver.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.driver!.phone}`)} accessibilityLabel="Call driver">
                  <Phone size={20} color={activeTheme.primary} />
                </TouchableOpacity>
              )}
            </View>
            {driverLocation && (
              <AppMap
                style={styles.map}
                colorScheme={colorScheme}
                markers={[
                  { id: 'driver', ...driverLocation, color: activeTheme.primary, title: 'Driver' },
                  ...(order.address?.lat != null && order.address?.lng != null
                    ? [{ id: 'home', latitude: order.address.lat, longitude: order.address.lng, color: palette.success, title: 'You' }]
                    : []),
                ]}
              />
            )}
          </Card>
        )}

        {/* Where */}
        <Card variant="flat" style={styles.section}>
          <View style={styles.inline}>
            <MapPin size={16} color={activeTheme.textSecondary} />
            <Typography variant="bodySm" weight="bold">{order.fulfilment === 'DELIVERY' ? 'Delivering to' : 'Collect from'}</Typography>
          </View>
          <Typography variant="bodySm" color={activeTheme.textSecondary} style={{ marginTop: 4 }}>
            {order.fulfilment === 'DELIVERY'
              ? order.address ? formatAddress(order.address) : '—'
              : order.provider.address || 'Address shared once the seller accepts'}
          </Typography>
          {!!order.scheduledFor && (
            <Typography variant="bodySm" color={activeTheme.textSecondary}>Scheduled for {formatDateTime(order.scheduledFor)}</Typography>
          )}
          {!!order.provider.phone && (
            <Button
              label="Call seller"
              variant="ghost"
              size="sm"
              icon={<Phone size={14} color={activeTheme.primary} />}
              onPress={() => Linking.openURL(`tel:${order.provider.phone}`)}
              style={{ alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: 0 }}
            />
          )}
        </Card>

        {/* Items & totals */}
        <Card variant="outlined" style={styles.section}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Typography variant="bodySm" weight="bold">{item.quantity}×</Typography>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySm">{item.title}</Typography>
                {item.options.length > 0 && (
                  <Typography variant="caption" color={activeTheme.textSecondary}>{item.options.map((o) => o.name).join(', ')}</Typography>
                )}
                {!!item.notes && <Typography variant="caption" color={activeTheme.textSecondary}>“{item.notes}”</Typography>}
              </View>
              <Typography variant="bodySm">{formatMoney(item.unitPrice * item.quantity, order.currency)}</Typography>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: activeTheme.border }]} />
          <TotalRow label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
          {order.deliveryFee > 0 && <TotalRow label="Delivery" value={formatMoney(order.deliveryFee, order.currency)} />}
          {order.serviceFee > 0 && <TotalRow label="Service fee" value={formatMoney(order.serviceFee, order.currency)} />}
          {order.tax > 0 && <TotalRow label="Tax" value={formatMoney(order.tax, order.currency)} />}
          {order.discount > 0 && <TotalRow label="Discount" value={`- ${formatMoney(order.discount, order.currency)}`} />}
          <TotalRow label="Total" value={formatMoney(order.total, order.currency)} bold />
          <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: spacing.xs }}>
            {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.paymentStatus.toLowerCase()}
          </Typography>
        </Card>

        {/* Review */}
        {isComplete && (
          <Card variant="flat" style={styles.section}>
            {order.review ? (
              <>
                <Typography variant="body" weight="bold">Your review</Typography>
                <Stars value={order.review.rating} />
                {!!order.review.comment && <Typography variant="bodySm" color={activeTheme.textSecondary}>{order.review.comment}</Typography>}
              </>
            ) : (
              <>
                <Typography variant="body" weight="bold">How was your order?</Typography>
                <Stars value={rating} onChange={setRating} />
                <TextField placeholder="Tell others about your experience (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} />
                <Button label="Post review" variant="primary" loading={submitReview.isPending} onPress={handleReview} />
              </>
            )}
          </Card>
        )}

        <View style={styles.actions}>
          {BUYER_CANCELLABLE.includes(order.status) && (
            <Button label="Cancel order" variant="outline" loading={cancelOrder.isPending} onPress={handleCancel} />
          )}
          {(isComplete || isTerminalFailure) && (
            <Button label="Order again" variant="primary" icon={<RotateCcw size={16} color="#fff" />} onPress={handleReorder} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const TotalRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={styles.totalRow}>
    <Typography variant={bold ? 'body' : 'bodySm'} weight={bold ? 'bold' : 'regular'}>{label}</Typography>
    <Typography variant={bold ? 'body' : 'bodySm'} weight={bold ? 'bold' : 'semibold'}>{value}</Typography>
  </View>
);

const Stars = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} disabled={!onChange} onPress={() => onChange?.(n)} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
        <Star size={32} color={palette.warning} fill={n <= value ? palette.warning : 'transparent'} />
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginVertical: spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  section: { marginTop: spacing.md, padding: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md },
  stepMarker: { alignItems: 'center', width: 22 },
  stepDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepLine: { width: 2, flex: 1, minHeight: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  map: { height: 200, borderRadius: radius.md, marginTop: spacing.md },
  itemRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  divider: { height: 1, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stars: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  actions: { marginTop: spacing.lg, gap: spacing.md },
});
