import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { notify } from '@/src/utils/notify';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useAdminProviders, useCreateAdminService } from '@/src/hooks/useAdmin';

export default function AdminInventoryScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: providers, isLoading } = useAdminProviders();
  const createService = useCreateAdminService();

  const [providerId, setProviderId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('SERVICES');
  const [unit, setUnit] = useState('per service');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = async () => {
    if (!providerId || !title || !price || !category) {
      notify('Missing fields', 'Please select a provider and enter title, price, and category.');
      return;
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      notify('Invalid price', 'Please enter a valid positive number.');
      return;
    }

    try {
      await createService.mutateAsync({
        providerId,
        title,
        description: description || undefined,
        price: parsedPrice,
        currency: 'USD',
        unit: unit || undefined,
        category,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        imageUrl: imageUrl || undefined,
      });
      notify('Success', 'Item created and assigned to the selected provider');
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('SERVICES');
      setUnit('per service');
      setImageUrl('');
      setTags('');
    } catch (error: any) {
      notify('Unable to create item', error?.response?.data?.message || error?.message || 'Try again');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]}> 
      <View style={styles.section}>
        <Typography variant="h1" weight="bold">Create Inventory Item</Typography>
        <Typography variant="body" color={activeTheme.textSecondary} style={styles.subtitle}>
          Choose a provider, then add a service or product listing to the marketplace.
        </Typography>

        <View style={styles.sectionCard}>
          <Typography variant="bodySm" weight="bold" style={styles.label}>Select Provider</Typography>
          {isLoading ? (
            <Typography variant="bodySm" color={activeTheme.textSecondary}>Loading providers…</Typography>
          ) : !providers?.length ? (
            <Typography variant="bodySm" color={activeTheme.textSecondary}>No providers found. Create a provider account first.</Typography>
          ) : (
            providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  { borderColor: activeTheme.border, backgroundColor: provider.id === providerId ? activeTheme.surface : activeTheme.surfaceVariant },
                ]}
                onPress={() => setProviderId(provider.id)}
              >
                <Typography variant="bodySm" weight="bold">{provider.businessName}</Typography>
                <Typography variant="caption" color={activeTheme.textSecondary}>{provider.city || provider.user?.email}</Typography>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.formRow}>
          <TextInput
            placeholder="Title"
            placeholderTextColor={activeTheme.textSecondary}
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Category (e.g. GOODS)"
            placeholderTextColor={activeTheme.textSecondary}
            value={category}
            onChangeText={setCategory}
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Price"
            placeholderTextColor={activeTheme.textSecondary}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Unit (e.g. per hour)"
            placeholderTextColor={activeTheme.textSecondary}
            value={unit}
            onChangeText={setUnit}
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Tags (comma separated)"
            placeholderTextColor={activeTheme.textSecondary}
            value={tags}
            onChangeText={setTags}
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Image URL (optional)"
            placeholderTextColor={activeTheme.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />
          <TextInput
            placeholder="Description"
            placeholderTextColor={activeTheme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.textArea, { borderColor: activeTheme.border, color: activeTheme.text }]}
          />

          <Button
            label={createService.isPending ? 'Creating...' : 'Create Item'}
            variant="primary"
            onPress={handleSubmit}
            disabled={createService.isPending}
            style={styles.submitButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  providerCard: {
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  formRow: {
    gap: spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  label: {
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
