import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { PhotoListEditor, SpecsEditor, flattenCategories, specsToRecord, Spec, Img } from '@/src/components/catalog/ProductFormParts';
import { useCategoryTree } from '@/src/hooks/useCatalog';
import { useCreateProductRequest } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

const BARCODE_RE = /^[0-9]{8,14}$/;

/** A seller asks the catalog team to add a product that isn't in the catalog yet */
export default function RequestProduct() {
  const t = useMarketTheme();
  const router = useRouter();
  const { title: initialTitle } = useLocalSearchParams<{ title?: string }>();
  const { data: tree } = useCategoryTree();
  const create = useCreateProductRequest();

  const [title, setTitle] = useState(initialTitle ?? '');
  const [brandName, setBrandName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<Img[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([{ key: '', value: '' }]);

  const categoryOptions = useMemo(() => flattenCategories(tree ?? []), [tree]);

  const missing = title.trim().length < 3 ? 'Enter the product name'
    : !images.length ? 'Add at least one photo'
    : barcode.trim() && !BARCODE_RE.test(barcode.trim()) ? 'The barcode should be the 8–14 digits under the bars'
    : weight.trim() && !(Number(weight) > 0) ? 'Weight must be a number of kg'
    : referenceUrl.trim() && !/^https?:\/\/\S+$/.test(referenceUrl.trim()) ? 'The link should start with https://'
    : null;

  const submit = async () => {
    try {
      await create.mutateAsync({
        title: title.trim(),
        brandName: brandName.trim() || undefined,
        categoryId: categoryId ?? undefined,
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
        weightKg: weight.trim() ? Number(weight) : undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        note: note.trim() || undefined,
        images: images.map(({ url, alt }) => ({ url, alt })),
        specifications: specsToRecord(specs),
      });
      notify('Request sent', 'The catalog team usually reviews requests within 2 working days. We’ll let you know.');
      router.replace('/merchant/requests');
    } catch (e) {
      notify('Could not send the request', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Typography variant="bodySm" color={t.textSecondary}>
        Can’t find your product in the catalog? Tell us about it. Once our catalog team adds it, you can list your price and stock, and so can other sellers.
      </Typography>

      <Panel title="The product">
        <Field label="Product name" value={title} onChangeText={setTitle} placeholder="Brand, model and size, e.g. Sunbright Solar Lantern 20W" />
        <View style={styles.row2}>
          <View style={styles.flex}><Field label="Brand (optional)" value={brandName} onChangeText={setBrandName} placeholder="e.g. Sunbright" /></View>
          <View style={styles.flex}><Field label="Weight (kg, optional)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0.5" /></View>
        </View>
        <OptionPicker label="Category (optional)" placeholder="Best guess is fine" value={categoryId} options={categoryOptions} onChange={setCategoryId} />
        <Field label="Barcode (optional)" hint="The numbers under the barcode on the box. Helps us avoid duplicates." value={barcode} onChangeText={setBarcode} keyboardType="number-pad" placeholder="e.g. 6001234567890" />
        <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline placeholder="What it is and what’s in the box" style={styles.multiline} />
      </Panel>

      <Panel title="Photos" right={<Typography variant="caption" color={t.textSecondary}>Clear, on a plain background</Typography>}>
        <PhotoListEditor images={images} onChange={setImages} alt={title} max={8} />
      </Panel>

      <Panel title="Specifications (optional)">
        <SpecsEditor specs={specs} onChange={setSpecs} />
      </Panel>

      <Panel title="Anything else?">
        <Field label="Manufacturer or product page (optional)" value={referenceUrl} onChangeText={setReferenceUrl} autoCapitalize="none" placeholder="https://" />
        <Field label="Note to the catalog team (optional)" value={note} onChangeText={setNote} multiline style={styles.multiline} />
      </Panel>

      {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
      <Button label="Send request" size="lg" onPress={submit} loading={create.isPending} disabled={!!missing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
