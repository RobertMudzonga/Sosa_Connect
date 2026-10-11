import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore, getUnitPrice } from '@/src/store/cart-store';
import { formatMoney } from '@/src/utils/format';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CartScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotals, getItemCount } = useCartStore();

  // Delivery fees, tax and promos are calculated by the server at checkout
  const subtotals = Object.entries(getTotals());

  // Group items by provider
  const providers = Array.from(new Set(items.map(i => i.providerId)));

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: activeTheme.background }]}>
        <View style={[styles.emptyIconBox, { backgroundColor: activeTheme.surfaceVariant }]}>
          <ShoppingBag size={48} color={activeTheme.textSecondary} />
        </View>
        <Typography variant="h3" weight="bold" style={{ marginTop: 24 }}>Your cart is empty</Typography>
        <Typography variant="body" color={activeTheme.textSecondary} align="center" style={{ marginTop: 8, paddingHorizontal: 40 }}>
          Looks like you haven&apos;t added anything to your cart yet.
        </Typography>
        <Button label="Go Shopping" variant="primary" style={{ marginTop: 32, width: 200 }} onPress={() => router.push('/search')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold">Your Cart</Typography>
        <Typography variant="bodySm" color={activeTheme.textSecondary}>{getItemCount()} items from {providers.length} {providers.length === 1 ? 'vendor' : 'vendors'}</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {providers.map(providerId => {
          const providerItems = items.filter(i => i.providerId === providerId);
          const providerName = providerItems[0].providerName;

          return (
            <View key={providerId} style={styles.vendorSection}>
              <View style={styles.vendorHeader}>
                <Typography variant="body" weight="bold">{providerName}</Typography>
              </View>

              {providerItems.map(item => (
                <Card key={item.lineId} variant="flat" style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemImagePlaceholder, { backgroundColor: activeTheme.border }]}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <ShoppingBag size={20} color="#fff" />}
                    </View>
                    
                    <View style={styles.itemInfo}>
                      <Typography variant="body" weight="semibold" numberOfLines={1}>{item.title}</Typography>
                      {item.options.length > 0 && (
                        <Typography variant="caption" color={activeTheme.textSecondary} numberOfLines={2}>
                          {item.options.map(o => o.name).join(', ')}
                        </Typography>
                      )}
                      {!!item.notes && (
                        <Typography variant="caption" color={activeTheme.textSecondary} numberOfLines={1}>
                          “{item.notes}”
                        </Typography>
                      )}
                      <Typography variant="bodySm" weight="bold" color={activeTheme.primary}>
                        {formatMoney(getUnitPrice(item), item.currency)}
                      </Typography>
                    </View>

                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.lineId, -1)}
                        style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
                      >
                        <Minus size={16} color={activeTheme.text} />
                      </TouchableOpacity>
                      <Typography variant="body" weight="bold" style={styles.qtyText}>{item.quantity}</Typography>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.lineId, 1)}
                        style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
                      >
                        <Plus size={16} color={activeTheme.text} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => removeItem(item.lineId)} style={styles.deleteBtn}>
                      <Trash2 size={20} color={activeTheme.error} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          );
        })}

        <Card variant="outlined" style={styles.summaryCard}>
          <Typography variant="body" weight="bold" style={{ marginBottom: 16 }}>Order Summary</Typography>
          {subtotals.map(([currency, amount]) => (
            <View key={currency} style={styles.summaryRow}>
              <Typography variant="body" weight="bold">Subtotal{subtotals.length > 1 ? ` (${currency})` : ''}</Typography>
              <Typography variant="h3" weight="bold" color={activeTheme.primary}>{formatMoney(amount, currency)}</Typography>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: activeTheme.border }]} />
          <Typography variant="caption" color={activeTheme.textSecondary}>
            Delivery fees, taxes and promo codes are applied at checkout.
          </Typography>
        </Card>

        <Button
          label="Proceed to Checkout"
          variant="primary"
          size="lg"
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout')}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorSection: {
    marginBottom: spacing.xl,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    minWidth: 20,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  summaryCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  checkoutBtn: {
    marginTop: spacing.xl,
  },
});
