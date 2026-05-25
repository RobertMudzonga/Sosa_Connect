import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/src/store/cart-store';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';

export default function CartScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { items, updateQuantity, removeItem, getTotal } = useCartStore();

  const subtotal = getTotal();
  const deliveryFee = items.length > 0 ? 5.00 : 0;
  const tax = subtotal * 0.15; // 15% VAT example
  const total = subtotal + deliveryFee + tax;

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
          Looks like you haven't added anything to your cart yet.
        </Typography>
        <Button label="Go Shopping" variant="primary" style={{ marginTop: 32, width: 200 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.header}>
        <Typography variant="h2" weight="bold">Your Cart</Typography>
        <Typography variant="bodySm" color={activeTheme.textSecondary}>{items.length} items from {providers.length} vendors</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {providers.map(providerId => {
          const providerItems = items.filter(i => i.providerId === providerId);
          const providerName = providerItems[0].providerName;

          return (
            <View key={providerId} style={styles.vendorSection}>
              <View style={styles.vendorHeader}>
                <Typography variant="body" weight="bold">{providerName}</Typography>
                <View style={[styles.badge, { backgroundColor: activeTheme.surfaceVariant }]}>
                  <Typography variant="caption" weight="bold" color={activeTheme.primary}>EXPRESS</Typography>
                </View>
              </View>

              {providerItems.map(item => (
                <Card key={item.id} variant="flat" style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemImagePlaceholder, { backgroundColor: activeTheme.border }]}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <ShoppingBag size={20} color="#fff" />}
                    </View>
                    
                    <View style={styles.itemInfo}>
                      <Typography variant="body" weight="semibold" numberOfLines={1}>{item.title}</Typography>
                      <Typography variant="bodySm" weight="bold" color={activeTheme.primary}>
                        {item.currency} {item.price}
                      </Typography>
                    </View>

                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, -1)}
                        style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
                      >
                        <Minus size={16} color={activeTheme.text} />
                      </TouchableOpacity>
                      <Typography variant="body" weight="bold" style={styles.qtyText}>{item.quantity}</Typography>
                      <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, 1)}
                        style={[styles.qtyBtn, { borderColor: activeTheme.border }]}
                      >
                        <Plus size={16} color={activeTheme.text} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
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
          <View style={styles.summaryRow}>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>Subtotal</Typography>
            <Typography variant="bodySm" weight="semibold">USD {subtotal.toFixed(2)}</Typography>
          </View>
          <View style={styles.summaryRow}>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>Delivery Fee</Typography>
            <Typography variant="bodySm" weight="semibold">USD {deliveryFee.toFixed(2)}</Typography>
          </View>
          <View style={styles.summaryRow}>
            <Typography variant="bodySm" color={activeTheme.textSecondary}>Tax (15%)</Typography>
            <Typography variant="bodySm" weight="semibold">USD {tax.toFixed(2)}</Typography>
          </View>
          <View style={[styles.divider, { backgroundColor: activeTheme.border }]} />
          <View style={styles.summaryRow}>
            <Typography variant="body" weight="bold">Total</Typography>
            <Typography variant="h3" weight="bold" color={activeTheme.primary}>USD {total.toFixed(2)}</Typography>
          </View>
        </Card>

        <Button label="Proceed to Checkout" variant="primary" style={styles.checkoutBtn} />
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
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
