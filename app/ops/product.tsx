import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { Field, Panel, Pill, Tabs, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCatalogProduct, useCategoryTree } from '@/src/hooks/useCatalog';
import { useBrands, useOpsAction, useProductRequest, catalogApi, ProductInput } from '@/src/hooks/useOps';
import { DuplicatesPanel } from '@/src/components/catalog/DuplicatesPanel';
import { PhotoListEditor, SpecsEditor, flattenCategories, specsFromRecord, specsToRecord, Spec, Img } from '@/src/components/catalog/ProductFormParts';
import { getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const SKU_RE = /^[A-Za-z0-9._-]{2,64}$/;

/** "Sunbright", "Solar Lantern 20W" → "SUN-SOLA-LANT-20W": a starting point the admin can edit */
function suggestSku(brand: string | null, title: string) {
  const words = title.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const b = brand?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const rest = words.filter((w) => !b || !w.startsWith(b)).slice(0, 3).map((w) => w.slice(0, 4));
  return [b, ...rest].filter(Boolean).join('-').slice(0, 40);
}

export default function ProductEditor() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id, requestId } = useLocalSearchParams<{ id?: string; requestId?: string }>();
  const isNew = !id;
  const { data: product, isLoading } = useCatalogProduct(id);
  const { data: req, isLoading: reqLoading } = useProductRequest(isNew ? requestId : undefined);
  const { data: tree } = useCategoryTree();
  const { data: brands } = useBrands();

  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>('DRAFT');
  const [specs, setSpecs] = useState<Spec[]>([{ key: '', value: '' }]);
  const [images, setImages] = useState<Img[]>([]);
  const [reviewNote, setReviewNote] = useState('');
  const [newCategory, setNewCategory] = useState<{ name: string; parentId: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fill the form once when editing an existing product
  useEffect(() => {
    if (!product || loaded) return;
    setTitle(product.title);
    setSku(product.sku);
    setBrand(product.brand?.id ?? null);
    setCategoryId(product.categoryId ?? product.breadcrumb[product.breadcrumb.length - 1]?.id ?? null);
    setDescription(product.description ?? '');
    setWeight(product.weightKg?.toString() ?? '');
    setStatus(product.status ?? 'ACTIVE');
    setSpecs(specsFromRecord(product.specifications));
    setImages(product.images.map((i) => ({ url: i.url, thumbUrl: i.thumbUrl !== i.url ? i.thumbUrl : undefined, alt: i.alt ?? undefined })));
    setLoaded(true);
  }, [product, loaded]);

  // Or once from a seller's request, after brands load so a known brand is matched by name
  useEffect(() => {
    if (!req || !brands || loaded) return;
    const known = req.brandName ? brands.find((b) => b.name.toLowerCase() === req.brandName!.toLowerCase()) : undefined;
    setTitle(req.title);
    setSku(suggestSku(req.brandName, req.title));
    setBrand(known?.id ?? req.brandName ?? null);
    setCategoryId(req.category?.id ?? null);
    setDescription(req.description ?? '');
    setWeight(req.weightKg?.toString() ?? '');
    setStatus('ACTIVE');
    // Keep the barcode on the product so later requests for it are flagged as duplicates
    setSpecs(specsFromRecord(req.barcode && !('Barcode' in req.specifications) ? { ...req.specifications, Barcode: req.barcode } : req.specifications));
    setImages(req.images.map((i) => ({ url: i.url, alt: i.alt })));
    setLoaded(true);
  }, [req, brands, loaded]);

  const categoryOptions = useMemo(() => flattenCategories(tree ?? []), [tree]);
  const brandOptions = (brands ?? []).map((b) => ({ value: b.id, label: b.name }));
  const brandIsNew = !!brand && !brandOptions.some((b) => b.value === brand);

  const save = useOpsAction(async () => {
    let brandId: string | null = brand;
    if (brandIsNew) brandId = (await catalogApi.createBrand(brand!.trim())).id;
    const specifications = specsToRecord(specs);
    const body: ProductInput = {
      title: title.trim(),
      sku: sku.trim(),
      description: description.trim() || undefined,
      brandId,
      categoryId: categoryId!,
      specifications,
      status,
      weightKg: weight.trim() ? Number(weight) : undefined,
      images,
    };
    if (req) return catalogApi.approveRequest(req.id, { ...body, reviewNote: reviewNote.trim() || undefined }).then((r) => r.product!);
    return isNew ? catalogApi.create(body) : catalogApi.update(id!, body);
  });
  const archive = useOpsAction(() => catalogApi.archive(id!));
  const addCategory = useOpsAction(() => catalogApi.createCategory({ name: newCategory!.name.trim(), parentId: newCategory!.parentId }));

  if ((!isNew && (isLoading || !loaded)) || (requestId && (reqLoading || (req && !loaded)))) {
    return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  }

  const missing = title.trim().length < 2 ? 'Enter a title'
    : !SKU_RE.test(sku.trim()) ? 'Enter a SKU (letters, numbers, . _ -)'
    : !categoryId ? 'Choose a category'
    : weight.trim() && !(Number(weight) > 0) ? 'Weight must be a number of kg'
    : status === 'ACTIVE' && !images.length ? 'Add at least one photo before publishing'
    : null;

  const onSave = async () => {
    try {
      const saved = await save.mutateAsync(undefined);
      if (req) {
        notify('Product created', `${req.seller.businessName} has been told they can add their offer.`);
        router.back();
      } else if (isNew) {
        notify('Product created', status === 'ACTIVE' ? 'It is live. Sellers can now add offers.' : 'Saved as a draft.');
        router.replace({ pathname: '/ops/product', params: { id: saved.id } });
      } else {
        notify('Saved', 'Changes are live.');
      }
    } catch (e) {
      notify('Could not save', getErrorMessage(e));
    }
  };

  const onArchive = async () => {
    if (!(await confirmAction('Archive this product?', 'It disappears from search and its offers stop selling. Past orders keep their history.', 'Archive', true))) return;
    try {
      await archive.mutateAsync(undefined);
      setStatus('ARCHIVED');
    } catch (e) {
      notify('Could not archive', getErrorMessage(e));
    }
  };

  const createCategory = async () => {
    try {
      const created = await addCategory.mutateAsync(undefined);
      setCategoryId(created.id);
      setNewCategory(null);
    } catch (e) {
      notify('Could not add category', getErrorMessage(e));
    }
  };

  const buyBox = product?.buyBox;
  const sellerCount = product ? (buyBox ? 1 : 0) + product.otherOffers.length : 0;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: req ? 'Create from request' : isNew ? 'New product' : 'Edit product' }} />

      {req && (
        <Panel title={`Requested by ${req.seller.businessName}`}>
          <Typography variant="caption" color={t.textSecondary}>
            We filled this in from the seller’s request. Check the title, choose a SKU and tidy the details before creating it.
          </Typography>
          {req.note ? <Typography variant="bodySm">“{req.note}”</Typography> : null}
          <Field label="Message to the seller (optional)" value={reviewNote} onChangeText={setReviewNote} placeholder="e.g. We shortened the title" />
        </Panel>
      )}

      {!isNew && product && (
        <Panel title="Selling now" right={<Pill label={status === 'ACTIVE' ? 'Live' : status === 'DRAFT' ? 'Draft' : 'Archived'} tone={status === 'ACTIVE' ? 'good' : status === 'DRAFT' ? 'warn' : 'bad'} />}>
          <Typography variant="bodySm" color={t.textSecondary}>
            {sellerCount ? `${sellerCount} seller${sellerCount === 1 ? '' : 's'} in stock` : 'No sellers in stock'}
            {buyBox ? ` · Buy Box ${usd(buyBox.price.usd)} from ${buyBox.seller.name}` : ''}
            {product.outOfStockOfferCount ? ` · ${product.outOfStockOfferCount} sold out` : ''}
          </Typography>
          {status === 'ACTIVE' && (
            <TouchableOpacity onPress={() => router.push({ pathname: '/catalog/[slug]', params: { slug: product.slug } })}>
              <Typography variant="caption" weight="bold" color={t.accent}>View in shop</Typography>
            </TouchableOpacity>
          )}
        </Panel>
      )}

      <Panel title="Basics">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Samsung Galaxy A15 128GB Dual SIM" />
        <View style={styles.row2}>
          <View style={styles.flex}><Field label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" placeholder="e.g. SAM-A15" /></View>
          <View style={styles.flex}><Field label="Weight (kg, optional)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0.2" /></View>
        </View>
        <OptionPicker label="Brand (optional)" placeholder="Choose or type a new brand" value={brand} options={brandOptions} onChange={setBrand} allowCustom />
        {brandIsNew && <Typography variant="caption" color={t.textSecondary}>“{brand}” will be added as a new brand when you save.</Typography>}
        <OptionPicker label="Category" placeholder="Choose a category" value={categoryId} options={categoryOptions} onChange={setCategoryId} />
        {newCategory ? (
          <View style={[styles.inset, { borderColor: t.border }]}>
            <Field label="New category name" value={newCategory.name} onChangeText={(name) => setNewCategory((c) => ({ ...c!, name }))} />
            <OptionPicker label="Inside (optional)" placeholder="Top level" value={newCategory.parentId} options={categoryOptions}
              onChange={(parentId) => setNewCategory((c) => ({ ...c!, parentId }))} />
            <Typography variant="caption" color={t.textSecondary}>New categories start at 10% commission; change it under Rates & rules.</Typography>
            <View style={styles.row2}>
              <Button label="Cancel" variant="ghost" size="sm" onPress={() => setNewCategory(null)} style={styles.flex} />
              <Button label="Add category" size="sm" disabled={newCategory.name.trim().length < 2} loading={addCategory.isPending} onPress={createCategory} style={styles.flex} />
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setNewCategory({ name: '', parentId: categoryId })}>
            <Typography variant="caption" weight="bold" color={t.accent}>+ New category</Typography>
          </TouchableOpacity>
        )}
        <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What buyers should know" style={styles.multiline} />
      </Panel>

      <Panel title="Photos" right={<Typography variant="caption" color={t.textSecondary}>First photo is the main one</Typography>}>
        <PhotoListEditor images={images} onChange={setImages} alt={title} />
      </Panel>

      <Panel title="Specifications">
        <SpecsEditor specs={specs} onChange={setSpecs} />
      </Panel>

      <Panel title="Visibility">
        {status === 'ARCHIVED' ? (
          <>
            <Typography variant="bodySm" color={t.textSecondary}>Archived: hidden from buyers and sellers.</Typography>
            <Button label="Restore as draft" variant="outline" size="sm" onPress={() => setStatus('DRAFT')} />
          </>
        ) : (
          <>
            <Tabs value={status} onChange={setStatus} options={[{ value: 'DRAFT', label: 'Draft (hidden)' }, { value: 'ACTIVE', label: 'Live' }]} />
            <Typography variant="caption" color={t.textSecondary}>
              {status === 'ACTIVE' ? 'Live products appear in search and sellers can add offers.' : 'Drafts are only visible here.'}
            </Typography>
          </>
        )}
      </Panel>

      {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
      <Button label={req ? 'Create product & approve' : isNew ? 'Create product' : 'Save changes'} size="lg" disabled={!!missing} loading={save.isPending} onPress={onSave} />
      {!isNew && product && status !== 'ARCHIVED' && <DuplicatesPanel productId={product.id} title={product.title} />}
      {!isNew && status !== 'ARCHIVED' && <Button label="Archive product" variant="ghost" onPress={onArchive} loading={archive.isPending} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.sm },
  inset: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
});
