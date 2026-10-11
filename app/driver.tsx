import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Linking, Platform, TouchableOpacity } from 'react-native';
import { Redirect } from 'expo-router';
import * as Location from 'expo-location';
import { Navigation, Phone, Package, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/auth-store';
import {
  useAvailableDeliveries, useMyDeliveries, useAcceptDelivery, useUpdateDeliveryStatus, sendDriverLocation, Delivery,
} from '@/src/hooks/useDeliveries';
import { formatAddress } from '@/src/hooks/useAddresses';
import { pickImage, uploadImage } from '@/src/services/uploads';
import { formatMoney, getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';

const openNavigation = (lat?: number, lng?: number, address?: string) => {
  const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(address ?? '');
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
};

export default function DriverScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const role = useAuthStore((s) => s.user?.role);
  const { data: available, refetch: refetchAvailable, isRefetching } = useAvailableDeliveries();
  const { data: mine, refetch: refetchMine } = useMyDeliveries();
  const acceptDelivery = useAcceptDelivery();
  const updateStatus = useUpdateDeliveryStatus();
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = (mine ?? []).filter((d) => d.status === 'ASSIGNED' || d.status === 'PICKED_UP');
  const activeId = active[0]?.id;

  // Share live location with customers while a delivery is in progress
  useEffect(() => {
    if (!activeId || Platform.OS === 'web') return;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 50 },
        (pos) => { sendDriverLocation(activeId, pos.coords.latitude, pos.coords.longitude).catch(() => {}); },
      );
    })();
    return () => subscription?.remove();
  }, [activeId]);

  if (role !== 'DRIVER' && role !== 'ADMIN') return <Redirect href="/(tabs)" />;

  const handleAccept = async (delivery: Delivery) => {
    setBusyId(delivery.id);
    try {
      await acceptDelivery.mutateAsync(delivery.id);
    } catch (error) {
      notify('Could not accept', getErrorMessage(error, 'Another driver may have taken this job.'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePickedUp = async (delivery: Delivery) => {
    setBusyId(delivery.id);
    try {
      await updateStatus.mutateAsync({ id: delivery.id, status: 'PICKED_UP' });
    } catch (error) {
      notify('Could not update', getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelivered = async (delivery: Delivery) => {
    const confirmed = await confirmAction(
      'Confirm delivery',
      delivery.cashToCollect
        ? `Collect ${formatMoney(delivery.cashToCollect, delivery.currency)} cash, then take a photo as proof of delivery.`
        : 'Take a photo of the delivered order as proof of delivery.',
      'Take photo',
    );
    if (!confirmed) return;
    setBusyId(delivery.id);
    try {
      const uri = await pickImage('camera');
      if (!uri) return;
      const proofPhotoUrl = await uploadImage(uri);
      await updateStatus.mutateAsync({ id: delivery.id, status: 'DELIVERED', proofPhotoUrl });
    } catch (error) {
      notify('Could not complete delivery', getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const renderDelivery = (d: Delivery, mode: 'available' | 'active') => {
    const pickedUp = d.status === 'PICKED_UP';
    return (
      <Card key={d.id} variant="elevated" style={styles.card}>
        <View style={styles.cardHeader}>
          <Typography variant="body" weight="bold">#{d.orderReference}</Typography>
          <Typography variant="body" weight="bold" color={palette.success}>{formatMoney(d.fee, d.currency)}</Typography>
        </View>

        <View style={styles.stop}>
          <Package size={16} color={pickedUp ? activeTheme.textSecondary : activeTheme.primary} />
          <View style={{ flex: 1 }}>
            <Typography variant="bodySm" weight="bold">Pick up · {d.pickup.name}</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>{d.pickup.address}</Typography>
          </View>
          {mode === 'active' && !pickedUp && (
            <TouchableOpacity onPress={() => openNavigation(d.pickup.lat, d.pickup.lng, d.pickup.address)} accessibilityLabel="Navigate to pickup">
              <Navigation size={20} color={activeTheme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.stop}>
          <MapPin size={16} color={pickedUp ? activeTheme.primary : activeTheme.textSecondary} />
          <View style={{ flex: 1 }}>
            <Typography variant="bodySm" weight="bold">Drop off{d.dropoff.contactName ? ` · ${d.dropoff.contactName}` : ''}</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>{formatAddress(d.dropoff)}</Typography>
            {!!d.dropoff.instructions && <Typography variant="caption" color={activeTheme.warning}>{d.dropoff.instructions}</Typography>}
          </View>
          {mode === 'active' && pickedUp && (
            <TouchableOpacity onPress={() => openNavigation(d.dropoff.lat, d.dropoff.lng, formatAddress(d.dropoff))} accessibilityLabel="Navigate to drop-off">
              <Navigation size={20} color={activeTheme.primary} />
            </TouchableOpacity>
          )}
        </View>

        <Typography variant="caption" color={activeTheme.textSecondary}>
          {d.itemCount} {d.itemCount === 1 ? 'item' : 'items'}
          {d.cashToCollect ? ` · Collect ${formatMoney(d.cashToCollect, d.currency)} cash` : ' · Prepaid'}
        </Typography>

        <View style={styles.actions}>
          {mode === 'active' && (pickedUp ? d.dropoff.phone : d.pickup.phone) && (
            <Button
              label="Call"
              variant="ghost"
              size="sm"
              icon={<Phone size={14} color={activeTheme.primary} />}
              onPress={() => Linking.openURL(`tel:${pickedUp ? d.dropoff.phone : d.pickup.phone}`)}
            />
          )}
          {mode === 'available' && (
            <Button label="Accept job" variant="primary" size="sm" loading={busyId === d.id} disabled={!!activeId} onPress={() => handleAccept(d)} />
          )}
          {mode === 'active' && !pickedUp && (
            <Button label="Picked up" variant="primary" size="sm" loading={busyId === d.id} onPress={() => handlePickedUp(d)} />
          )}
          {mode === 'active' && pickedUp && (
            <Button label="Delivered" variant="primary" size="sm" loading={busyId === d.id} onPress={() => handleDelivered(d)} />
          )}
        </View>
      </Card>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: activeTheme.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchAvailable(); refetchMine(); }} tintColor={activeTheme.primary} />}
    >
      <Typography variant="h3" weight="bold" style={styles.sectionTitle}>Current delivery</Typography>
      {active.length ? active.map((d) => renderDelivery(d, 'active')) : (
        <Typography variant="bodySm" color={activeTheme.textSecondary}>No active delivery. Accept a job below.</Typography>
      )}

      <Typography variant="h3" weight="bold" style={styles.sectionTitle}>Available jobs</Typography>
      {!!activeId && (
        <View style={[styles.notice, { backgroundColor: activeTheme.surfaceVariant }]}>
          <Typography variant="caption" color={activeTheme.textSecondary}>Finish your current delivery to accept another job.</Typography>
        </View>
      )}
      {available?.length ? available.map((d) => renderDelivery(d, 'available')) : (
        <Typography variant="bodySm" color={activeTheme.textSecondary}>No jobs right now. This list refreshes automatically.</Typography>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.sm },
  card: { padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  notice: { padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm },
});
