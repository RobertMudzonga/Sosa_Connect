import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, Trash2, Plus } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { AddressForm } from '@/src/components/features/AddressForm';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAddresses, useDeleteAddress, formatAddress, Address } from '@/src/hooks/useAddresses';
import { confirmAction, notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';

export default function AddressesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: addresses, isLoading } = useAddresses();
  const deleteAddress = useDeleteAddress();
  const [adding, setAdding] = useState(false);

  const handleDelete = async (address: Address) => {
    const confirmed = await confirmAction('Delete address?', `Remove "${address.label}" from your saved addresses?`, 'Delete', true);
    if (!confirmed) return;
    try {
      await deleteAddress.mutateAsync(address.id);
    } catch (error) {
      notify('Could not delete address', getErrorMessage(error));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {isLoading && <ActivityIndicator color={activeTheme.primary} />}
      {(addresses ?? []).map((a) => (
        <Card key={a.id} variant="flat" style={styles.card}>
          <MapPin size={20} color={activeTheme.primary} />
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="bold">{a.label}{a.isDefault ? ' · Default' : ''}</Typography>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>{formatAddress(a)}</Typography>
            {!!a.instructions && <Typography variant="caption" color={activeTheme.textSecondary}>{a.instructions}</Typography>}
          </View>
          <TouchableOpacity onPress={() => handleDelete(a)} accessibilityLabel={`Delete ${a.label}`}>
            <Trash2 size={18} color={activeTheme.error} />
          </TouchableOpacity>
        </Card>
      ))}
      {!isLoading && !addresses?.length && !adding && (
        <Typography variant="body" color={activeTheme.textSecondary} align="center" style={{ marginVertical: spacing.lg }}>
          No saved addresses yet.
        </Typography>
      )}
      {adding ? (
        <Card variant="outlined" style={{ marginTop: spacing.md }}>
          <AddressForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Card>
      ) : (
        <Button
          label="Add address"
          variant="primary"
          icon={<Plus size={16} color="#fff" />}
          onPress={() => setAdding(true)}
          style={{ marginTop: spacing.md }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
});
