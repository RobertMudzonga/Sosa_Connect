import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Star, MapPin, Heart, ShieldCheck, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../common/Typography';
import { Card } from './Card';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cart-store';
import { useFavouritesStore } from '../../store/favourites-store';
import { formatMoney } from '../../utils/format';

export interface Product {
  id: string;
  providerId: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  rating?: number;
  providerName: string;
  imageUrl?: string;
  isVerified?: boolean;
  isAvailable?: boolean;
  /** Item has choices (size, extras) that must be picked on the detail screen */
  hasOptions?: boolean;
  category: string;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  horizontal?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  horizontal = false,
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const toggleFavourite = useFavouritesStore((state) => state.toggle);
  const isFavourite = useFavouritesStore((state) => state.items.some((p) => p.id === product.id));
  const available = product.isAvailable !== false;

  const openProduct = onPress ?? (() => router.push({ pathname: '/product/[id]', params: { id: product.id } }));

  const handleAdd = () => {
    if (product.hasOptions) {
      // Choices must be made on the detail screen
      openProduct();
      return;
    }
    addItem({
      serviceId: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      providerId: product.providerId,
      providerName: product.providerName,
      imageUrl: product.imageUrl,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <TouchableOpacity onPress={openProduct} activeOpacity={0.9} style={horizontal ? styles.containerHorizontal : styles.containerVertical}>
      <Card padding="none" variant="elevated" style={styles.card}>
        <View style={horizontal ? styles.imageContainerHorizontal : styles.imageContainerVertical}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: activeTheme.surfaceVariant }]}>
              <Typography variant="caption" color={activeTheme.textSecondary}>No Image</Typography>
            </View>
          )}
          <View style={styles.badgeContainer}>
            <View style={styles.priceBadge}>
              <Typography variant="bodySm" weight="bold" style={{ color: '#fff' }}>
                {formatMoney(product.price, product.currency)}
              </Typography>
            </View>
          </View>
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => toggleFavourite(product)}
            accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart size={18} color={isFavourite ? palette.danger : '#fff'} fill={isFavourite ? palette.danger : 'transparent'} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Typography variant="body" weight="bold" numberOfLines={1} style={styles.title}>
              {product.title}
            </Typography>
            {!!product.rating && (
              <View style={styles.ratingRow}>
                <Star size={12} color={palette.warning} fill={palette.warning} />
                <Typography variant="caption" weight="semibold">{product.rating.toFixed(1)}</Typography>
              </View>
            )}
          </View>

          {!!product.location && (
            <View style={styles.locationRow}>
              <MapPin size={12} color={activeTheme.textSecondary} />
              <Typography variant="caption" color={activeTheme.textSecondary} numberOfLines={1}>
                {product.location}
              </Typography>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.providerRow}>
              <Typography variant="caption" weight="medium" color={activeTheme.textSecondary}>
                By {product.providerName}
              </Typography>
              {product.isVerified && (
                <ShieldCheck size={14} color={activeTheme.primary} style={styles.verifiedIcon} />
              )}
            </View>
            <View style={styles.footerRight}>
              <View style={[styles.categoryBadge, { backgroundColor: activeTheme.surfaceVariant }]}>
                <Typography variant="caption" weight="bold" style={{ fontSize: 10 }}>{product.category}</Typography>
              </View>
              {available ? (
                <TouchableOpacity
                  onPress={handleAdd}
                  style={[styles.addBtn, { backgroundColor: activeTheme.primary }]}
                  accessibilityLabel={`Add ${product.title} to cart`}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <Typography variant="caption" weight="bold" color={activeTheme.error}>Sold out</Typography>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  containerVertical: {
    width: '100%',
    marginBottom: spacing.md,
  },
  containerHorizontal: {
    width: 280,
    marginRight: spacing.md,
  },
  card: {
    flex: 1,
  },
  imageContainerVertical: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  imageContainerHorizontal: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
  },
  priceBadge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  wishlistBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
});
