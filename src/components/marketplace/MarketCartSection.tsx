import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2, AlertTriangle, PackageCheck, Truck } from 'lucide-react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { useMarketCartStore } from '../../store/market-cart-store';
import { useMarketStore } from '../../store/market-store';
import { useMarketQuote } from '../../hooks/useMarket';
import { formatPrice } from '../../utils/format';
import { radius, spacing } from '../../theme/spacing';
import { useMarketTheme } from './useMarketTheme';

/** Marketplace part of the Cart tab: lines grouped by parcel, live prices and stock from the server */
export const MarketCartSection: React.FC = () => {
  const t = useMarketTheme();
  const router = useRouter();
  const currency = useMarketStore((s) => s.currency);
  const { lines, setQuantity, remove } = useMarketCartStore();
  const body = useMemo(() => ({ items: lines.map((l) => ({ offerId: l.offerId, quantity: l.quantity })) }), [lines]);
  const { data: quote, isLoading, isError, refetch, isFetching } = useMarketQuote(lines.length ? body : null);

  const lineByOffer = new Map(lines.map((l) => [l.offerId, l]));
  const quoted = new Map((quote?.lines ?? []).map((l) => [l.offerId, l]));
  const issues = quote?.issues ?? [];

  /** Accept what the server can supply: shrink to available stock, drop sold-out lines */
  const fixIssues = () => {
    for (const issue of issues) {
      if (issue.availableQty > 0) setQuantity(issue.offerId, issue.availableQty);
      else remove(issue.offerId);
    }
  };

  const fd = quote?.freeDelivery;
  const progress = fd && fd.threshold.usd > 0 ? Math.min(1, quote!.totals.itemsSubtotal.usd / fd.threshold.usd) : 0;

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Typography variant="h3" weight="bold">Shop</Typography>
        {isFetching && !isLoading && <ActivityIndicator size="small" color={t.accent} />}
      </View>

      {issues.length > 0 && (
        <View style={[styles.issues, { backgroundColor: t.surfaceVariant, borderColor: t.warning }]}>
          <View style={styles.inline}>
            <AlertTriangle size={16} color={t.warning} />
            <Typography variant="bodySm" weight="bold">Some items changed</Typography>
          </View>
          {issues.map((i) => (
            <Typography key={i.offerId} variant="caption" color={t.textSecondary}>• {i.message}</Typography>
          ))}
          <Button label="Update my cart" size="sm" variant="secondary" onPress={fixIssues} style={styles.fixBtn} />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={t.accent} style={styles.loading} />
      ) : isError ? (
        <TouchableOpacity onPress={() => refetch()} style={styles.loading}>
          <Typography variant="bodySm" color={t.textSecondary} align="center">{"Couldn't check prices. Tap to retry."}</Typography>
        </TouchableOpacity>
      ) : (
        quote?.shipments.map((sh, idx) => {
          const byUs = sh.sourceType === 'PLATFORM_FULFILLED';
          return (
            <View key={sh.key} style={[styles.parcel, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.inline}>
                {byUs ? <PackageCheck size={15} color={t.accent} /> : <Truck size={15} color={t.textSecondary} />}
                <Typography variant="caption" weight="bold" color={byUs ? t.accent : t.textSecondary}>
                  Parcel {idx + 1} · {sh.label}
                </Typography>
              </View>
              {sh.items.map((item) => {
                const q = quoted.get(item.offerId);
                const local = lineByOffer.get(item.offerId);
                if (!q || !local) return null;
                const atMax = local.quantity >= q.availableQty;
                return (
                  <View key={item.offerId} style={styles.line}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/catalog/[slug]', params: { slug: q.slug } })} style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
                      {q.image ? <Image source={{ uri: q.image }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
                    </TouchableOpacity>
                    <View style={styles.flex}>
                      <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{q.title}</Typography>
                      <Typography variant="caption" color={t.textSecondary}>Sold by {q.sellerName}</Typography>
                      <Typography variant="bodySm" weight="bold">{formatPrice(q.lineTotal, currency)}</Typography>
                    </View>
                    <View style={styles.qtyCol}>
                      <View style={styles.qty}>
                        <TouchableOpacity
                          onPress={() => setQuantity(item.offerId, local.quantity - 1)}
                          style={[styles.qtyBtn, { borderColor: t.border }]}
                          accessibilityLabel={`Decrease ${q.title}`}
                        >
                          <Minus size={14} color={t.text} />
                        </TouchableOpacity>
                        <Typography variant="bodySm" weight="bold" style={styles.qtyText}>{local.quantity}</Typography>
                        <TouchableOpacity
                          onPress={() => setQuantity(item.offerId, local.quantity + 1)}
                          disabled={atMax}
                          style={[styles.qtyBtn, { borderColor: t.border, opacity: atMax ? 0.4 : 1 }]}
                          accessibilityLabel={`Increase ${q.title}`}
                        >
                          <Plus size={14} color={t.text} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => remove(item.offerId)} accessibilityLabel={`Remove ${q.title}`} style={styles.removeBtn}>
                        <Trash2 size={16} color={t.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })
      )}

      {quote && (
        <View style={[styles.summary, { borderColor: t.border }]}>
          {fd && fd.threshold.usd > 0 && (
            <View style={styles.gapXs}>
              <Typography variant="caption" color={fd.qualifies ? t.success : t.textSecondary}>
                {fd.qualifies
                  ? 'You get free delivery on this order'
                  : `Add ${formatPrice(fd.remaining, currency)} more for free delivery`}
              </Typography>
              <View style={[styles.bar, { backgroundColor: t.surfaceVariant }]}>
                <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: fd.qualifies ? t.success : t.accent }]} />
              </View>
            </View>
          )}
          <View style={styles.row}>
            <Typography variant="body" weight="bold">Subtotal</Typography>
            <Typography variant="h3" weight="bold">{formatPrice(quote.totals.itemsSubtotal, currency)}</Typography>
          </View>
          <Typography variant="caption" color={t.textSecondary}>Delivery is calculated at checkout.</Typography>
          <Button
            label="Checkout"
            size="lg"
            disabled={issues.length > 0 || quote.lines.length === 0}
            onPress={() => router.push('/market/checkout')}
            style={styles.checkoutBtn}
          />
          {issues.length > 0 && (
            <Typography variant="caption" color={t.textSecondary} align="center">Update your cart to continue.</Typography>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  section: { marginBottom: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gapXs: { gap: 6 },
  issues: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 4, marginBottom: spacing.md },
  fixBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  loading: { paddingVertical: spacing.lg },
  parcel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, marginBottom: spacing.md },
  line: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden' },
  qtyCol: { alignItems: 'flex-end', gap: 6 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyText: { minWidth: 18, textAlign: 'center' },
  removeBtn: { padding: 4 },
  summary: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutBtn: { marginTop: spacing.sm },
});
