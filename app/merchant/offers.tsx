import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Field, Pill, parseAmount, usd } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMyOffers, useUpdateOffer, MyOffer } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

const ELIGIBILITY: Record<MyOffer['eligibility'], { label: string; tone: 'bad' | 'warn' } | null> = {
  ELIGIBLE: null,
  INACTIVE: { label: 'Paused', tone: 'warn' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'bad' },
  SELLER_NOT_APPROVED: { label: 'Awaiting approval', tone: 'warn' },
  MISSING_HUB: { label: 'Hub unavailable', tone: 'bad' },
  HUBS_DISABLED: { label: 'Hubs switched off', tone: 'bad' },
  NO_BRANCH: { label: 'No branch: re-list at a branch', tone: 'bad' },
  BRANCH_UNAVAILABLE: { label: 'Branch paused or closed', tone: 'warn' },
};

function OfferEditor({ offer, onDone }: { offer: MyOffer; onDone: () => void }) {
  const t = useMarketTheme();
  const update = useUpdateOffer();
  const hubStock = offer.fulfilmentType === 'PLATFORM_FULFILLED';
  const [price, setPrice] = useState(String(offer.price.usd));
  const [listPrice, setListPrice] = useState(offer.listPrice ? String(offer.listPrice.usd) : '');
  const [shipping, setShipping] = useState(String(offer.shippingFee.usd));
  const [stock, setStock] = useState(String(offer.stockQty));
  const [prep, setPrep] = useState(String(offer.prepTimeMins));
  const [active, setActive] = useState(offer.isActive);

  const save = async () => {
    const priceUsd = parseAmount(price);
    if (!priceUsd) return notify('Check the price', 'Enter a selling price in USD.');
    try {
      await update.mutateAsync({
        id: offer.id,
        priceUsd,
        listPriceUsd: parseAmount(listPrice) ?? null,
        isActive: active,
        ...(hubStock ? {} : {
          shippingFeeUsd: parseAmount(shipping) ?? 0,
          stockQty: Math.max(0, Math.round(Number(stock) || 0)),
          prepTimeMins: Math.max(0, Math.round(Number(prep) || 0)),
        }),
      });
      onDone();
    } catch (e) {
      notify('Could not save', getErrorMessage(e));
    }
  };

  return (
    <View style={[styles.editor, { borderColor: t.border }]}>
      <View style={styles.row2}>
        <View style={styles.flex}><Field label="Price (USD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
        <View style={styles.flex}><Field label="Was price (optional)" value={listPrice} onChangeText={setListPrice} keyboardType="decimal-pad" /></View>
      </View>
      {hubStock ? (
        <Typography variant="caption" color={t.textSecondary}>
          Stock at {offer.hub?.name} changes when the hub receives your inbound shipments and as orders ship.
        </Typography>
      ) : (
        <View style={styles.row2}>
          <View style={styles.flex}><Field label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" /></View>
          <View style={styles.flex}><Field label="Packaging fee (USD)" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad" /></View>
          <View style={styles.flex}><Field label="Minutes to pack" value={prep} onChangeText={setPrep} keyboardType="number-pad" /></View>
        </View>
      )}
      <View style={styles.switchRow}>
        <Typography variant="bodySm" weight="semibold">Visible to buyers</Typography>
        <Switch value={active} onValueChange={setActive} />
      </View>
      <View style={styles.row2}>
        <Button label="Cancel" variant="ghost" onPress={onDone} style={styles.flex} />
        <Button label="Save" onPress={save} loading={update.isPending} style={styles.flex} />
      </View>
    </View>
  );
}

export default function MerchantOffers() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useMyOffers();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/merchant/new-offer')} accessibilityLabel="Add a product" style={styles.headerBtn}>
            <Plus size={22} color={t.accent} />
          </TouchableOpacity>
        ),
      }} />
      <FlatList
        data={data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => {
          const status = ELIGIBILITY[item.eligibility];
          const losing = !item.isBuyBoxWinner && item.buyBoxPrice && item.eligibility === 'ELIGIBLE';
          return (
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
                  {item.product.image ? <Image source={{ uri: item.product.image }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
                </View>
                <View style={styles.flex}>
                  <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{item.product.title}</Typography>
                  <Typography variant="caption" color={t.textSecondary}>
                    {item.fulfilmentType === 'PLATFORM_FULFILLED' ? `Kuwana hub · ${item.hub?.code}` : item.branch ? `${item.branch.name} branch · ${item.branch.code}` : 'No branch'} · {item.stockQty} in stock
                  </Typography>
                  <View style={styles.pills}>
                    {item.isBuyBoxWinner && <Pill label="Winning the Buy Box" tone="good" />}
                    {losing && (item.buyBoxPrice!.usd >= item.price.usd
                      // Already cheapest: buyers near another open store see that store first, so cutting price won't help
                      ? <Pill label={`Cheapest; nearer stores win locally (${usd(item.buyBoxPrice!.usd)})`} tone="warn" />
                      : <Pill label={`Buy Box at ${usd(item.buyBoxPrice!.usd)}`} tone="warn" />)}
                    {status && <Pill label={status.label} tone={status.tone} />}
                  </View>
                </View>
                <View style={styles.right}>
                  <Typography variant="body" weight="bold">{usd(item.price.usd)}</Typography>
                  {editing !== item.id && (
                    <TouchableOpacity onPress={() => setEditing(item.id)}>
                      <Typography variant="caption" weight="bold" color={t.accent}>Edit</Typography>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {editing === item.id && <OfferEditor offer={item} onDone={() => setEditing(null)} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={t.accent} /> : (
              <>
                <Typography variant="body" weight="semibold">No offers yet</Typography>
                <Typography variant="bodySm" color={t.textSecondary} align="center">Find a product in the Kuwana catalog and add your price.</Typography>
                <Button label="Add a product" onPress={() => router.push('/merchant/new-offer')} />
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  headerBtn: { paddingHorizontal: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  cardRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  editor: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  row2: { flexDirection: 'row', gap: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: 80, paddingHorizontal: spacing.lg },
});
