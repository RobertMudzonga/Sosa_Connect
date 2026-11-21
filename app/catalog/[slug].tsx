import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Star, PackageCheck, Truck, ShieldCheck, Store, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Price } from '@/src/components/marketplace/Price';
import { CurrencyToggle } from '@/src/components/marketplace/CurrencyToggle';
import { CityPicker } from '@/src/components/marketplace/CityPicker';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useCatalogProduct, CatalogOffer, CatalogProduct } from '@/src/hooks/useCatalog';
import { locationLabel, useBuyerLocation, useMarketStore } from '@/src/store/market-store';
import { useMarketCartStore } from '@/src/store/market-cart-store';
import * as Haptics from 'expo-haptics';
import { formatPrice, getErrorMessage } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

const MAX_IMAGE_WIDTH = 520;
/** Other stores shown before "Show all" */
const OTHER_STORES_PREVIEW = 2;

function SellerLine({ offer }: { offer: CatalogOffer }) {
  const t = useMarketTheme();
  return (
    <View style={styles.inline}>
      <Store size={14} color={t.textSecondary} />
      <Typography variant="bodySm" color={t.textSecondary}>Sold by </Typography>
      <Typography variant="bodySm" weight="semibold">{offer.seller.name}</Typography>
      {offer.seller.ratingCount > 0 && (
        // Kept in one row so the star never wraps away from its number
        <View style={[styles.inline, styles.noWrap, { marginLeft: 4 }]}>
          <Star size={11} color={t.star} fill={t.star} />
          <Typography variant="caption" color={t.textSecondary}>{offer.seller.ratingAvg.toFixed(1)}</Typography>
        </View>
      )}
    </View>
  );
}

function DeliveryLine({ offer }: { offer: CatalogOffer }) {
  const t = useMarketTheme();
  const currency = useMarketStore((s) => s.currency);
  const byUs = offer.fulfilmentType === 'PLATFORM_FULFILLED';
  const closed = offer.isOpenNow === false;
  const Icon = byUs ? PackageCheck : closed ? Clock : Truck;
  const color = byUs ? t.accent : closed ? t.warning : t.text;
  return (
    <View style={styles.gapXs}>
      <View style={styles.inline}>
        <Icon size={15} color={byUs ? t.accent : closed ? t.warning : t.textSecondary} />
        <Typography variant="bodySm" weight="semibold" color={color} style={styles.flex}>
          {offer.availability}
        </Typography>
      </View>
      {offer.deliveryFee ? (
        <Typography variant="caption" color={t.textSecondary}>
          Delivery {formatPrice(offer.deliveryFee, currency)}
          {offer.distanceKm !== null ? ` · ${offer.distanceKm} km away` : ''}
          {closed ? ' · packed when the store opens' : ''}
        </Typography>
      ) : null}
      {offer.shippingFee.usd > 0 && (
        <Typography variant="caption" color={t.textSecondary}>
          + {formatPrice(offer.shippingFee, currency)} store packaging
        </Typography>
      )}
      {offer.lowStock && (
        <Typography variant="caption" weight="semibold" color={t.warning}>Only {offer.stockQty} left</Typography>
      )}
    </View>
  );
}

function useAddToCart(product: CatalogProduct | undefined) {
  const add = useMarketCartStore((s) => s.add);
  const lines = useMarketCartStore((s) => s.lines);
  return {
    inCart: (offerId: string) => lines.find((l) => l.offerId === offerId)?.quantity ?? 0,
    add: (offer: CatalogOffer) => {
      if (!product) return;
      add({
        offerId: offer.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.images[0]?.thumbUrl ?? null,
        sellerName: offer.seller.name,
        unitPriceUsd: offer.price.usd,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
  };
}

export default function CatalogProductScreen() {
  const t = useMarketTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const currency = useMarketStore((s) => s.currency);
  const where = useMarketStore((s) => locationLabel(s));
  const location = useBuyerLocation();
  const { data: product, isLoading, isError, error, refetch, isFetching } = useCatalogProduct(slug, location);
  const [imageIndex, setImageIndex] = useState(0);
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);
  const cart = useAddToCart(product);

  const imageWidth = Math.min(width, MAX_IMAGE_WIDTH);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (isError || !product) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Stack.Screen options={{ title: '' }} />
        <Typography variant="body" color={t.textSecondary} align="center">{getErrorMessage(error, 'Product not found')}</Typography>
        <Button label="Try again" variant="outline" onPress={() => refetch()} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const specs = Object.entries(product.specifications ?? {});
  const visibleSpecs = showAllSpecs ? specs : specs.slice(0, 6);
  const buyBox = product.buyBox;
  const cheapestOther = product.otherOffers.reduce<CatalogOffer | null>(
    (min, o) => (!min || o.landedPrice.usd < min.landedPrice.usd ? o : min),
    null,
  );

  const onImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setImageIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth));
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: product.brand?.name ?? '' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Breadcrumb */}
        {product.breadcrumb.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumb}>
            {product.breadcrumb.map((c, i) => (
              <View key={c.id} style={styles.inline}>
                {i > 0 && <ChevronRight size={12} color={t.textSecondary} />}
                <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/search', params: { mode: 'products', department: c.slug } })}>
                  <Typography variant="caption" color={t.accent}>{c.name}</Typography>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Images */}
        <View style={[styles.gallery, { backgroundColor: t.surfaceVariant }]}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onImageScroll} style={{ width: imageWidth }}>
            {(product.images.length ? product.images : [null]).map((img, i) => (
              <View key={img?.url ?? i} style={{ width: imageWidth, height: imageWidth * 0.8 }}>
                {img && (
                  <Image
                    source={{ uri: img.url }}
                    placeholder={{ uri: img.thumbUrl }}
                    style={styles.fill}
                    contentFit="contain"
                    cachePolicy="disk"
                    transition={200}
                    accessibilityLabel={img.alt ?? product.title}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          {product.images.length > 1 && (
            <View style={styles.dots}>
              {product.images.map((img, i) => (
                <View key={img.url} style={[styles.dot, { backgroundColor: i === imageIndex ? t.accent : t.border }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          {product.brand && <Typography variant="bodySm" color={t.accent} weight="semibold">{product.brand.name}</Typography>}
          <Typography variant="h3" weight="bold">{product.title}</Typography>
          {product.ratingCount > 0 && (
            <View style={styles.inline}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} color={t.star} fill={n <= Math.round(product.ratingAvg) ? t.star : 'transparent'} />
              ))}
              <Typography variant="bodySm" color={t.textSecondary}> {product.ratingAvg.toFixed(1)} · {product.ratingCount} reviews</Typography>
            </View>
          )}
        </View>

        <View style={[styles.section, styles.controls]}>
          <CityPicker />
          <CurrencyToggle showRate />
        </View>

        {/* Buy Box */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border, opacity: isFetching ? 0.7 : 1 }]}>
          {buyBox ? (
            <>
              <Price price={buyBox.price} listPrice={buyBox.listPrice} size="lg" showAlternate />
              <DeliveryLine offer={buyBox} />
              <SellerLine offer={buyBox} />
              {buyBox.seller.isFirstParty && (
                <View style={styles.inline}>
                  <ShieldCheck size={14} color={t.accent} />
                  <Typography variant="caption" color={t.textSecondary}>Sold and shipped by Kuwana</Typography>
                </View>
              )}
              <Button
                label={cart.inCart(buyBox.id) ? `Add another (${cart.inCart(buyBox.id)} in cart)` : 'Add to cart'}
                onPress={() => cart.add(buyBox)}
                disabled={cart.inCart(buyBox.id) >= buyBox.stockQty}
                style={styles.cta}
              />
              {cart.inCart(buyBox.id) > 0 && (
                <Button label="View cart" variant="outline" onPress={() => router.push('/(tabs)/cart')} />
              )}
            </>
          ) : (
            <>
              <Typography variant="h3" weight="bold">
                {product.outOfRangeOfferCount > 0 ? 'Not available near you' : 'Out of stock'}
              </Typography>
              <Typography variant="bodySm" color={t.textSecondary}>
                {product.outOfRangeOfferCount > 0
                  ? `${product.outOfRangeOfferCount} ${product.outOfRangeOfferCount === 1 ? 'store has' : 'stores have'} this, but too far to deliver to ${where ?? 'you'}.`
                  : product.outOfStockOfferCount > 0
                    ? 'Stores are restocking this item. Check back soon.'
                    : 'No stores are offering this item right now.'}
              </Typography>
            </>
          )}
        </View>

        {!where && buyBox && (
          <View style={[styles.section, styles.inline]}>
            <MapPin size={14} color={t.textSecondary} />
            <Typography variant="caption" color={t.textSecondary} style={styles.flex}>
              Set your delivery location above to see the nearest store, delivery time and fee.
            </Typography>
          </View>
        )}

        {product.otherOffers.length === 0 && buyBox && product.outOfRangeOfferCount > 0 && (
          <View style={styles.section}>
            <Typography variant="caption" color={t.textSecondary}>
              {product.outOfRangeOfferCount} more {product.outOfRangeOfferCount === 1 ? 'store stocks' : 'stores stock'} this, too far to deliver to {where ?? 'you'}.
            </Typography>
          </View>
        )}

        {/* Other stores selling this */}
        {product.otherOffers.length > 0 && (
          <View style={styles.section}>
            <Typography variant="body" weight="bold">
              Other stores selling this ({product.otherOffers.length})
              {cheapestOther ? <Typography variant="body" color={t.textSecondary}> from {formatPrice(cheapestOther.landedPrice, currency)}{cheapestOther.deliveryFee ? ' delivered' : ''}</Typography> : null}
            </Typography>
            <View style={styles.gapSm}>
              {(showAllStores ? product.otherOffers : product.otherOffers.slice(0, OTHER_STORES_PREVIEW)).map((o) => (
                <View key={o.id} style={[styles.offerRow, { backgroundColor: t.surface, borderColor: t.border }]}>
                  <View style={styles.flex}>
                    <SellerLine offer={o} />
                    <DeliveryLine offer={o} />
                  </View>
                  <View style={styles.offerSide}>
                    <Price price={o.price} size="sm" />
                    <TouchableOpacity
                      onPress={() => cart.add(o)}
                      disabled={cart.inCart(o.id) >= o.stockQty}
                      style={[styles.addSmall, { borderColor: t.accent }]}
                      accessibilityLabel={`Add ${o.seller.name}'s offer to cart`}
                    >
                      <Typography variant="caption" weight="bold" color={t.accent}>
                        {cart.inCart(o.id) ? `Added (${cart.inCart(o.id)})` : 'Add'}
                      </Typography>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            {product.otherOffers.length > OTHER_STORES_PREVIEW && (
              <TouchableOpacity onPress={() => setShowAllStores((v) => !v)} accessibilityRole="button">
                <Typography variant="bodySm" weight="semibold" color={t.accent}>
                  {showAllStores ? 'Show fewer stores' : `Show all ${product.otherOffers.length} stores`}
                </Typography>
              </TouchableOpacity>
            )}
            <Typography variant="caption" color={t.textSecondary}>
              We feature the open store nearest you with the best delivered price.
              {product.outOfRangeOfferCount > 0 ? ` ${product.outOfRangeOfferCount} more too far to deliver to ${where ?? 'you'}.` : ''}
            </Typography>
          </View>
        )}

        {/* Specifications */}
        {specs.length > 0 && (
          <View style={styles.section}>
            <Typography variant="body" weight="bold">Specifications</Typography>
            <View style={[styles.specs, { borderColor: t.border }]}>
              {visibleSpecs.map(([k, v], i) => (
                <View key={k} style={[styles.specRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]}>
                  <Typography variant="bodySm" color={t.textSecondary} style={styles.specKey}>{k}</Typography>
                  <Typography variant="bodySm" style={styles.flex}>{String(v)}</Typography>
                </View>
              ))}
            </View>
            {specs.length > 6 && (
              <TouchableOpacity onPress={() => setShowAllSpecs((s) => !s)}>
                <Typography variant="bodySm" weight="semibold" color={t.accent}>{showAllSpecs ? 'Show less' : `Show all ${specs.length}`}</Typography>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!product.description && (
          <View style={styles.section}>
            <Typography variant="body" weight="bold">About this item</Typography>
            <Typography variant="bodySm" color={t.textSecondary}>{product.description}</Typography>
          </View>
        )}

        <Typography variant="caption" color={t.textSecondary} style={styles.sku}>SKU {product.sku}</Typography>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { paddingBottom: spacing.xxl },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  noWrap: { flexWrap: 'nowrap' },
  gapXs: { gap: 2 },
  gapSm: { gap: spacing.sm, marginVertical: spacing.sm },
  breadcrumb: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 4 },
  gallery: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, paddingVertical: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: 4 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  card: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  cta: { marginTop: spacing.xs },
  offerSide: { alignItems: 'flex-end', gap: spacing.sm },
  addSmall: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  offerRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  specs: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, marginTop: spacing.sm, marginBottom: 4 },
  specRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.md },
  specKey: { width: 120 },
  sku: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
});
