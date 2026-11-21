import { shadowXs } from '../../theme/colors';
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Star, PackageCheck } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { radius, spacing } from '../../theme/spacing';
import type { CatalogListItem } from '../../hooks/useCatalog';
import { Price } from './Price';
import { useMarketTheme } from './useMarketTheme';

interface Props {
  product: CatalogListItem;
  /** Fixed width for horizontal rails; omit to fill a grid column */
  width?: number;
}

/** Compact catalog tile: thumbnail, title, Buy Box price and availability */
export const CatalogProductCard: React.FC<Props> = ({ product, width }) => {
  const t = useMarketTheme();
  const router = useRouter();
  const fulfilledByUs = product.buyBox?.fulfilmentType === 'PLATFORM_FULFILLED';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/catalog/[slug]', params: { slug: product.slug } })}
      style={[styles.card, shadowXs, { backgroundColor: t.surface, borderColor: t.border }, width ? { width } : styles.flex]}
      accessibilityRole="button"
      accessibilityLabel={`${product.title}${product.inStock ? '' : ', out of stock'}`}
    >
      <View style={[styles.imageWrap, { backgroundColor: t.surfaceVariant }]}>
        {product.image ? (
          <Image
            source={{ uri: product.image.thumbUrl }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="disk"
            transition={150}
            accessibilityLabel={product.image.alt ?? product.title}
          />
        ) : null}
        {!product.inStock && (
          <View style={styles.oosBadge}>
            <Typography variant="caption" weight="bold" style={{ color: '#fff' }}>Out of stock</Typography>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {product.brand && (
          <Typography variant="caption" color={t.textSecondary} numberOfLines={1}>{product.brand.name}</Typography>
        )}
        <Typography variant="bodySm" weight="semibold" numberOfLines={2} style={styles.title}>
          {product.title}
        </Typography>

        {product.ratingCount > 0 && (
          <View style={styles.rating}>
            <Star size={11} color={t.star} fill={t.star} />
            <Typography variant="caption" color={t.textSecondary}>
              {product.ratingAvg.toFixed(1)} ({product.ratingCount})
            </Typography>
          </View>
        )}

        <View style={styles.priceRow}>
          {product.price ? (
            <Price price={product.price} listPrice={product.listPrice} size="sm" />
          ) : (
            <Typography variant="bodySm" color={t.textSecondary}>Currently unavailable</Typography>
          )}
        </View>

        {product.buyBox && (
          <View style={styles.availability}>
            {fulfilledByUs && <PackageCheck size={12} color={t.accent} />}
            <Typography variant="caption" color={fulfilledByUs ? t.accent : t.textSecondary} numberOfLines={2} style={styles.flex}>
              {product.buyBox.availability}
            </Typography>
          </View>
        )}
        {product.offerCount > 1 && (
          <Typography variant="caption" color={t.textSecondary}>{product.offerCount} stores</Typography>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  imageWrap: { aspectRatio: 1, width: '100%', position: 'relative' },
  image: { width: '100%', height: '100%' },
  oosBadge: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  body: { padding: spacing.sm + 2, gap: 3 },
  title: { minHeight: 40 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRow: { marginTop: 2 },
  availability: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
});
