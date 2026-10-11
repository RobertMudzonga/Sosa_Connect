import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMyProvider, useMyProviderStats, useUpdateMyProvider } from '@/src/hooks/useProviders';
import { formatMoney, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';

const toNumber = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function StoreSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: provider, isLoading } = useMyProvider();
  const { data: stats } = useMyProviderStats(!!provider);
  const updateProvider = useUpdateMyProvider();

  const [isOpen, setIsOpen] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [offersCollection, setOffersCollection] = useState(true);
  const [openingHours, setOpeningHours] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!provider) return;
    setIsOpen(provider.isOpen !== false);
    setOffersDelivery(provider.offersDelivery !== false);
    setOffersCollection(provider.offersCollection !== false);
    setOpeningHours(provider.openingHours ?? '');
    setDeliveryFee(provider.deliveryFee?.toString() ?? '');
    setMinOrder(provider.minOrder?.toString() ?? '');
    setDeliveryRadiusKm(provider.deliveryRadiusKm?.toString() ?? '');
    setPrepMinutes(provider.estimatedPrepMinutes?.toString() ?? '');
    setPhone(provider.phone ?? '');
    setAddress(provider.address ?? '');
    setDescription(provider.description ?? '');
  }, [provider]);

  if (isLoading) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={activeTheme.primary} />;
  if (!provider) {
    return <Typography align="center" color={activeTheme.textSecondary} style={{ marginTop: spacing.xl }}>No store found for this account.</Typography>;
  }

  const handleSave = async () => {
    const numbers = { deliveryFee: toNumber(deliveryFee), minOrder: toNumber(minOrder), deliveryRadiusKm: toNumber(deliveryRadiusKm), estimatedPrepMinutes: toNumber(prepMinutes) };
    if (Object.values(numbers).some((n) => n !== undefined && (Number.isNaN(n) || n < 0))) {
      notify('Check your numbers', 'Fees, minimum order, radius and prep time must be positive numbers.');
      return;
    }
    if (!offersDelivery && !offersCollection) {
      notify('Choose at least one', 'Offer delivery, collection, or both.');
      return;
    }
    try {
      await updateProvider.mutateAsync({
        isOpen, offersDelivery, offersCollection,
        openingHours: openingHours.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        ...numbers,
      });
      notify('Saved', 'Your store settings have been updated.');
    } catch (error) {
      notify('Could not save', getErrorMessage(error));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll}>
      {stats && (
        <Card variant="flat" style={styles.stats}>
          <Typography variant="body" weight="bold">Earnings</Typography>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Typography variant="h3" weight="bold">{formatMoney(stats.revenueToday, stats.currency)}</Typography>
              <Typography variant="caption" color={activeTheme.textSecondary}>Today · {stats.ordersToday} orders</Typography>
            </View>
            <View style={styles.stat}>
              <Typography variant="h3" weight="bold">{formatMoney(stats.revenueMonth, stats.currency)}</Typography>
              <Typography variant="caption" color={activeTheme.textSecondary}>This month</Typography>
            </View>
          </View>
        </Card>
      )}

      <Card variant="outlined" style={styles.toggles}>
        <ToggleRow label="Store is open" hint="Turn off to stop receiving orders" value={isOpen} onChange={setIsOpen} />
        <ToggleRow label="Offer delivery" value={offersDelivery} onChange={setOffersDelivery} />
        <ToggleRow label="Offer collection" value={offersCollection} onChange={setOffersCollection} />
      </Card>

      <TextField label="Opening hours" placeholder="e.g. Mon–Sat 08:00–20:00" value={openingHours} onChangeText={setOpeningHours} />
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}><TextField label="Delivery fee" keyboardType="decimal-pad" value={deliveryFee} onChangeText={setDeliveryFee} /></View>
        <View style={{ flex: 1 }}><TextField label="Minimum order" keyboardType="decimal-pad" value={minOrder} onChangeText={setMinOrder} /></View>
      </View>
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}><TextField label="Delivery radius (km)" keyboardType="decimal-pad" value={deliveryRadiusKm} onChangeText={setDeliveryRadiusKm} /></View>
        <View style={{ flex: 1 }}><TextField label="Prep time (min)" keyboardType="number-pad" value={prepMinutes} onChangeText={setPrepMinutes} /></View>
      </View>
      <TextField label="Store phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextField label="Store address" value={address} onChangeText={setAddress} hint="Shown to customers who collect" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />

      <Button label="Save settings" variant="primary" size="lg" loading={updateProvider.isPending} onPress={handleSave} />
    </ScrollView>
  );
}

const ToggleRow = ({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Typography variant="body" weight="semibold">{label}</Typography>
        {!!hint && <Typography variant="caption" color={activeTheme.textSecondary}>{hint}</Typography>}
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  stats: { marginBottom: spacing.md, gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  toggles: { marginBottom: spacing.lg, gap: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
});
