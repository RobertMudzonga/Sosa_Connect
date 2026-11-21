import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { OptionPicker } from '@/src/components/common/OptionPicker';
import { SearchBar } from '@/src/components/features/SearchBar';
import { Field, Panel, Tabs, parseAmount, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCatalogSearch, useCatalogProduct } from '@/src/hooks/useCatalog';
import { useCreateOffer, useHubs, useMyBranches } from '@/src/hooks/useMerchant';
import { useMarketSettings } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

/** The product the offer is for, from search or from an approved product request */
type Picked = { id: string; title: string; buyBoxUsd: number | null; buyBoxSeller: string | null };

export default function NewOffer() {
  const t = useMarketTheme();
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { data: preset } = useCatalogProduct(productId);
  const { data: hubs } = useHubs();
  const { data: branches, isLoading: branchesLoading } = useMyBranches();
  const { data: settings } = useMarketSettings();
  const hubsEnabled = !!settings?.hubsEnabled;
  const openBranches = (branches ?? []).filter((b) => b.isActive);
  const create = useCreateOffer();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<Picked | null>(null);
  const [mode, setMode] = useState<'SELLER_FULFILLED' | 'PLATFORM_FULFILLED'>('SELLER_FULFILLED');
  const [hubId, setHubId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [prep, setPrep] = useState('');
  const [sellerSku, setSellerSku] = useState('');

  // One branch: preselect it. Packing time defaults to the branch's usual time.
  useEffect(() => {
    if (!branchId && openBranches.length === 1) setBranchId(openBranches[0].id);
  }, [openBranches, branchId]);
  const branch = openBranches.find((b) => b.id === branchId);
  useEffect(() => {
    if (branch) setPrep(String(branch.defaultPrepTimeMins));
  }, [branch]);

  useEffect(() => {
    if (preset) setProduct({ id: preset.id, title: preset.title, buyBoxUsd: preset.buyBox?.price.usd ?? null, buyBoxSeller: preset.buyBox?.seller.name ?? null });
  }, [preset]);

  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const { data, isFetching } = useCatalogSearch({ q: q || undefined, sort: 'relevance' }, { enabled: !product, limit: 10 });
  const results = data?.pages[0]?.data ?? [];

  const missing = !product ? 'Choose a product'
    : !parseAmount(price) ? 'Enter your price'
    : mode === 'PLATFORM_FULFILLED' && !hubId ? 'Choose the hub you will send stock to'
    : mode === 'SELLER_FULFILLED' && !branchId ? 'Choose the branch that holds this stock'
    : mode === 'SELLER_FULFILLED' && stock.trim() === '' ? 'Enter how many you have'
    : null;

  const submit = async () => {
    try {
      await create.mutateAsync({
        productId: product!.id,
        priceUsd: parseAmount(price)!,
        fulfilmentType: mode,
        sellerSku: sellerSku.trim() || undefined,
        ...(mode === 'PLATFORM_FULFILLED'
          ? { hubId: hubId! }
          : {
              storeBranchId: branchId!,
              stockQty: Math.max(0, Math.round(Number(stock) || 0)),
              ...(prep.trim() ? { prepTimeMins: Math.max(0, Math.round(Number(prep) || 0)) } : {}),
            }),
      });
      if (mode === 'PLATFORM_FULFILLED') {
        notify('Offer created', 'Now send stock to the hub. It goes on sale when the hub receives it.');
        router.replace('/merchant/inbound');
      } else {
        router.replace('/merchant/offers');
      }
    } catch (e) {
      notify('Could not add this product', getErrorMessage(e));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!product ? (
        <>
          <Typography variant="bodySm" color={t.textSecondary}>
            Products come from the shared Kuwana catalog, so buyers can compare sellers on one page. Find yours and add your price.
          </Typography>
          <View style={styles.searchWrap}><SearchBar value={text} onChangeText={setText} placeholder="Search the catalog" /></View>
          {isFetching && <ActivityIndicator color={t.accent} />}
          {results.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => setProduct({ id: p.id, title: p.title, buyBoxUsd: p.price?.usd ?? null, buyBoxSeller: p.buyBox?.sellerName ?? null })} style={[styles.result, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
                {p.image ? <Image source={{ uri: p.image.thumbUrl }} style={styles.fill} contentFit="contain" /> : null}
              </View>
              <View style={styles.flex}>
                <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{p.title}</Typography>
                <Typography variant="caption" color={t.textSecondary}>
                  {p.brand?.name ?? p.category.name}{p.price ? ` · Buy Box ${usd(p.price.usd)}` : ' · no sellers yet'}
                </Typography>
              </View>
            </TouchableOpacity>
          ))}
          {!isFetching && q && results.length === 0 && (
            <Typography variant="bodySm" color={t.textSecondary} align="center">Not in the catalog yet.</Typography>
          )}
          {!isFetching && q && (
            <View style={[styles.requestBox, { borderColor: t.border }]}>
              <Typography variant="bodySm" color={t.textSecondary} align="center">
                {results.length ? 'Not the right product?' : 'Ask our catalog team to add it. Once it’s added you can list your offer.'}
              </Typography>
              <Button label="Request this product" variant="outline" size="sm"
                onPress={() => router.push({ pathname: '/merchant/request-product', params: { title: q } })} />
            </View>
          )}
        </>
      ) : (
        <>
          <Panel title={product.title} right={<TouchableOpacity onPress={() => setProduct(null)}><Typography variant="caption" weight="bold" color={t.accent}>Change</Typography></TouchableOpacity>}>
            <Typography variant="caption" color={t.textSecondary}>
              {product.buyBoxUsd !== null ? `Current Buy Box price: ${usd(product.buyBoxUsd)} from ${product.buyBoxSeller}` : 'No one is selling this yet.'}
            </Typography>
          </Panel>

          <Panel title="Where is the stock?">
            {hubsEnabled && (
              <Tabs value={mode} onChange={setMode} options={[{ value: 'SELLER_FULFILLED', label: 'At my branch' }, { value: 'PLATFORM_FULFILLED', label: 'Kuwana hub' }]} />
            )}
            <Typography variant="caption" color={t.textSecondary}>
              {mode === 'PLATFORM_FULFILLED'
                ? 'You send stock to a Kuwana hub; we store, pack and deliver. A fulfilment fee applies per unit sold.'
                : 'You pack each order at this branch; a nearby Kuwana driver collects it and delivers to the buyer.'}
            </Typography>
            {mode === 'SELLER_FULFILLED' && (
              openBranches.length || branchesLoading ? (
                <OptionPicker label="Branch" placeholder="Choose a branch" value={branchId} searchable={false}
                  options={openBranches.map((b) => ({ value: b.id, label: `${b.name} · ${b.code}`, hint: `${b.suburb?.name ?? b.city.name}${b.isPaused ? ' · paused' : ''}` }))}
                  onChange={setBranchId} />
              ) : (
                <View style={[styles.requestBox, { borderColor: t.border }]}>
                  <Typography variant="bodySm" color={t.textSecondary} align="center">Add a branch first: buyers and drivers need to know where the stock is.</Typography>
                  <Button label="Add a branch" variant="outline" size="sm" onPress={() => router.push('/merchant/branch')} />
                </View>
              )
            )}
            {mode === 'PLATFORM_FULFILLED' && (
              <OptionPicker label="Hub" placeholder="Choose a hub" value={hubId}
                options={(hubs ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.address }))} onChange={setHubId} searchable={false} />
            )}
          </Panel>

          <Panel title="Your offer">
            <View style={styles.row2}>
              <View style={styles.flex}><Field label="Price (USD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" /></View>
              <View style={styles.flex}><Field label="Your SKU (optional)" value={sellerSku} onChangeText={setSellerSku} /></View>
            </View>
            {mode === 'SELLER_FULFILLED' && (
              <View style={styles.row2}>
                <View style={styles.flex}><Field label="Stock at this branch" value={stock} onChangeText={setStock} keyboardType="number-pad" /></View>
                <View style={styles.flex}><Field label="Minutes to pack" value={prep} onChangeText={setPrep} keyboardType="number-pad" /></View>
              </View>
            )}
          </Panel>

          {missing && <Typography variant="caption" color={t.textSecondary} align="center">{missing}</Typography>}
          <Button label="Create offer" size="lg" onPress={submit} loading={create.isPending} disabled={!!missing} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  searchWrap: { marginHorizontal: -spacing.lg },
  result: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, overflow: 'hidden' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  requestBox: { borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
});
