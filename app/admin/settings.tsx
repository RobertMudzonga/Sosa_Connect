import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdminSettings, useUpdateAdminSettings } from '@/src/hooks/useAdmin';
import { notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';

export default function AdminSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [commission, setCommission] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [tax, setTax] = useState('');

  useEffect(() => {
    if (!settings) return;
    setCommission(settings.commissionPercent.toString());
    setServiceFee(settings.serviceFee.toString());
    setTax(settings.taxPercent.toString());
  }, [settings]);

  const handleSave = async () => {
    const values = { commissionPercent: Number(commission), serviceFee: Number(serviceFee), taxPercent: Number(tax) };
    if (Object.values(values).some((v) => Number.isNaN(v) || v < 0) || values.commissionPercent > 100 || values.taxPercent > 100) {
      notify('Invalid values', 'Percentages must be between 0 and 100 and fees cannot be negative.');
      return;
    }
    try {
      await updateSettings.mutateAsync(values);
      notify('Saved', 'Platform settings updated. New orders use these values.');
    } catch (error) {
      notify('Could not save', getErrorMessage(error));
    }
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={activeTheme.primary} />;

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll}>
      <Typography variant="body" color={activeTheme.textSecondary} style={{ marginBottom: spacing.lg }}>
        These apply to new orders only. Existing orders keep the fees they were placed with.
      </Typography>
      <TextField label="Seller commission (%)" keyboardType="decimal-pad" value={commission} onChangeText={setCommission} hint="Kept by Kuwana from each order subtotal" />
      <TextField label={`Buyer service fee (${settings?.currency ?? 'USD'})`} keyboardType="decimal-pad" value={serviceFee} onChangeText={setServiceFee} hint="Flat fee added to each order" />
      <TextField label="Tax (%)" keyboardType="decimal-pad" value={tax} onChangeText={setTax} />
      <Button label="Save settings" variant="primary" size="lg" loading={updateSettings.isPending} onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
});
