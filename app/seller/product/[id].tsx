import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ImagePlus } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { TextField, Chip } from '@/src/components/common/TextField';
import { theme } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useService, useCreateService, useUpdateService, useDeleteService, ServiceInput } from '@/src/hooks/useServices';
import { pickImage, uploadImage } from '@/src/services/uploads';
import { OptionGroupsEditor, OptionGroupDraft, parseOptionGroups } from '@/src/components/features/OptionGroupsEditor';
import { confirmAction, notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';

const CATEGORIES = ['FOOD', 'GOODS', 'SERVICES', 'DELIVERY'];
const CURRENCIES = ['USD', 'ZWG'];

export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  const { data: existing, isLoading } = useService(isNew ? undefined : id);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('FOOD');
  const [section, setSection] = useState('');
  const [unit, setUnit] = useState('');
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [optionGroups, setOptionGroups] = useState<OptionGroupDraft[]>([]);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setPrice(existing.price.toString());
    setCurrency(existing.currency);
    setCategory(existing.category);
    setSection(existing.section ?? '');
    setUnit(existing.unit ?? '');
    setTrackStock(typeof existing.stock === 'number');
    setStock(existing.stock?.toString() ?? '');
    setIsAvailable(existing.isAvailable !== false);
    setImageUrl(existing.imageUrl);
    setOptionGroups((existing.optionGroups ?? []).map((g) => ({
      key: g.id,
      id: g.id,
      name: g.name,
      required: g.required,
      maxSelect: g.maxSelect.toString(),
      options: g.options.map((o) => ({ key: o.id, id: o.id, name: o.name, price: o.price.toString() })),
    })));
  }, [existing]);

  const handlePickImage = async (source: 'library' | 'camera') => {
    try {
      const uri = await pickImage(source);
      if (!uri) return;
      setUploading(true);
      setImageUrl(await uploadImage(uri));
    } catch (error) {
      notify('Upload failed', getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const parsedPrice = Number(price);
    const parsedStock = trackStock ? Number(stock) : null;
    if (!title.trim()) return notify('Missing title', 'Give your product a name.');
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) return notify('Invalid price', 'Enter a price greater than zero.');
    if (trackStock && (parsedStock === null || Number.isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock))) {
      return notify('Invalid stock', 'Stock must be a whole number of 0 or more.');
    }
    const parsedOptions = parseOptionGroups(optionGroups);
    if ('error' in parsedOptions) return notify('Check your options', parsedOptions.error);

    const dto: ServiceInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      price: parsedPrice,
      currency,
      category,
      section: section.trim() || undefined,
      unit: unit.trim() || undefined,
      stock: parsedStock,
      isAvailable,
      imageUrl,
      optionGroups: parsedOptions.groups,
    };
    try {
      if (isNew) await createService.mutateAsync(dto);
      else await updateService.mutateAsync({ id, ...dto });
      router.back();
    } catch (error) {
      notify('Could not save product', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAction('Delete product?', 'This removes the listing from your store.', 'Delete', true);
    if (!confirmed) return;
    try {
      await deleteService.mutateAsync(id);
      router.back();
    } catch (error) {
      notify('Could not delete product', getErrorMessage(error));
    }
  };

  if (!isNew && isLoading) return <ActivityIndicator style={{ marginTop: spacing.xl }} color={activeTheme.primary} />;

  return (
    <ScrollView style={{ backgroundColor: activeTheme.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Add Product' : 'Edit Product' }} />

      <View style={[styles.imageBox, { backgroundColor: activeTheme.surfaceVariant }]}>
        {uploading ? <ActivityIndicator color={activeTheme.primary} /> : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <Typography variant="caption" color={activeTheme.textSecondary}>No photo yet</Typography>
        )}
      </View>
      <View style={styles.imageActions}>
        <TouchableOpacity style={styles.imageAction} onPress={() => handlePickImage('library')}>
          <ImagePlus size={18} color={activeTheme.primary} />
          <Typography variant="bodySm" weight="semibold" color={activeTheme.primary}>Choose photo</Typography>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageAction} onPress={() => handlePickImage('camera')}>
          <Camera size={18} color={activeTheme.primary} />
          <Typography variant="bodySm" weight="semibold" color={activeTheme.primary}>Take photo</Typography>
        </TouchableOpacity>
      </View>

      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Sadza & beef stew" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />

      <Typography variant="bodySm" weight="semibold" style={styles.label}>Category</Typography>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
      </View>

      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}><TextField label="Price" keyboardType="decimal-pad" value={price} onChangeText={setPrice} /></View>
        <View style={{ flex: 1 }}>
          <Typography variant="bodySm" weight="semibold" style={styles.label}>Currency</Typography>
          <View style={styles.chips}>
            {CURRENCIES.map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}
          </View>
        </View>
      </View>
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}><TextField label="Menu section" value={section} onChangeText={setSection} placeholder="e.g. Mains" /></View>
        <View style={{ flex: 1 }}><TextField label="Unit" value={unit} onChangeText={setUnit} placeholder="e.g. per kg" /></View>
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Typography variant="body" weight="semibold">Track stock</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>Turn off for made-to-order items</Typography>
        </View>
        <Switch value={trackStock} onValueChange={setTrackStock} />
      </View>
      {trackStock && <TextField label="Units in stock" keyboardType="number-pad" value={stock} onChangeText={setStock} />}

      <View style={{ marginVertical: spacing.md }}>
        <OptionGroupsEditor groups={optionGroups} onChange={setOptionGroups} currency={currency} />
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Typography variant="body" weight="semibold">Available to order</Typography>
        </View>
        <Switch value={isAvailable} onValueChange={setIsAvailable} />
      </View>

      <Button
        label={isNew ? 'Create product' : 'Save changes'}
        variant="primary"
        size="lg"
        disabled={uploading}
        loading={createService.isPending || updateService.isPending}
        onPress={handleSave}
        style={{ marginTop: spacing.lg }}
      />
      {!isNew && (
        <Button label="Delete product" variant="ghost" loading={deleteService.isPending} onPress={handleDelete} style={{ marginTop: spacing.sm }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  imageBox: { height: 180, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageActions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginVertical: spacing.md },
  imageAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
});
