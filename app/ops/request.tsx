import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { SearchBar } from '@/src/components/features/SearchBar';
import { Field, Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { REQUEST_STATUS } from '@/src/components/catalog/requestStatus';
import { useProductRequest, useAdminProducts, useOpsAction, catalogApi } from '@/src/hooks/useOps';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

type Candidate = { id: string; title: string; sku: string; status: string; image: string | null; barcodeMatch?: boolean };

/** Review one seller request: create the product, link it to an existing one, or decline */
export default function ReviewProductRequest() {
  const t = useMarketTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, isLoading } = useProductRequest(id);
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const search = useAdminProducts(q);

  const link = useOpsAction((productId: string) => catalogApi.linkRequest(id, { productId }));
  const reject = useOpsAction(() => catalogApi.rejectRequest(id, reason.trim()));

  if (isLoading || !r) {
    return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  }

  const status = REQUEST_STATUS[r.status];
  const specs = Object.entries(r.specifications);
  const searchResults: Candidate[] = q ? (search.data ?? []).filter((p) => p.status !== 'ARCHIVED').slice(0, 6) : [];

  const onLink = async (p: Candidate) => {
    if (!(await confirmAction('Link to this product?', `${r.seller.businessName} will be told “${r.title}” is already listed as “${p.title}”, and can add an offer to it.`, 'Link'))) return;
    try {
      await link.mutateAsync(p.id);
      notify('Linked', 'The seller has been told.');
    } catch (e) {
      notify('Could not link', getErrorMessage(e));
    }
  };

  const onReject = async () => {
    try {
      await reject.mutateAsync(undefined);
      notify('Declined', 'The seller has been told why.');
    } catch (e) {
      notify('Could not decline', getErrorMessage(e));
    }
  };

  const candidateRow = (p: Candidate) => (
    <View key={p.id} style={styles.matchRow}>
      <View style={[styles.thumbSm, { backgroundColor: t.surfaceVariant }]}>
        {p.image ? <Image source={{ uri: p.image }} style={styles.fill} contentFit="contain" /> : null}
      </View>
      <View style={styles.shrink}>
        <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{p.title}</Typography>
        <Typography variant="caption" color={t.textSecondary}>
          {p.sku}{p.status !== 'ACTIVE' ? ' · draft' : ''}{p.barcodeMatch ? ' · same barcode' : ''}
        </Typography>
      </View>
      <Button label="It’s this one" size="sm" variant="outline" onPress={() => onLink(p)} disabled={link.isPending} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <View style={styles.shrink}>
          <Typography variant="h3" weight="bold">{r.title}</Typography>
          <Typography variant="caption" color={t.textSecondary}>
            From {r.seller.businessName}{r.seller.kycStatus !== 'APPROVED' ? ` (verification ${r.seller.kycStatus.toLowerCase()})` : ''} · {formatDateTime(r.createdAt)}
          </Typography>
        </View>
        <Pill label={status.label} tone={status.tone} />
      </View>

      {r.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {r.images.map((img, i) => (
            <View key={`${img.url}-${i}`} style={[styles.photo, { backgroundColor: t.surfaceVariant, borderColor: t.border }]}>
              <Image source={{ uri: img.url }} style={styles.fill} contentFit="contain" />
            </View>
          ))}
        </ScrollView>
      )}

      <Panel title="What the seller sent">
        {[
          ['Brand', r.brandName],
          ['Category', r.category?.name],
          ['Barcode', r.barcode],
          ['Weight', r.weightKg ? `${r.weightKg} kg` : null],
        ].map(([label, value]) => (
          <View key={label} style={styles.kv}>
            <Typography variant="caption" color={t.textSecondary} style={styles.kvLabel}>{label}</Typography>
            <Typography variant="bodySm" style={styles.shrink}>{value || '—'}</Typography>
          </View>
        ))}
        {specs.map(([k, v]) => (
          <View key={k} style={styles.kv}>
            <Typography variant="caption" color={t.textSecondary} style={styles.kvLabel}>{k}</Typography>
            <Typography variant="bodySm" style={styles.shrink}>{String(v)}</Typography>
          </View>
        ))}
        {r.description ? <Typography variant="bodySm">{r.description}</Typography> : null}
        {r.referenceUrl ? (
          <TouchableOpacity onPress={() => Linking.openURL(r.referenceUrl!)}>
            <Typography variant="caption" weight="bold" color={t.accent} numberOfLines={1}>{r.referenceUrl}</Typography>
          </TouchableOpacity>
        ) : null}
        {r.note ? <Typography variant="bodySm" color={t.textSecondary}>Seller’s note: “{r.note}”</Typography> : null}
      </Panel>

      {r.status === 'PENDING' ? (
        <>
          <Panel title="Already in the catalog?">
            {r.possibleMatches.length ? (
              <>
                <Typography variant="caption" color={t.textSecondary}>These look similar. If one is the same product, link the request to it.</Typography>
                {r.possibleMatches.map(candidateRow)}
              </>
            ) : (
              <Typography variant="caption" color={t.textSecondary}>No similar products found by title or barcode.</Typography>
            )}
            <View style={styles.searchWrap}><SearchBar value={text} onChangeText={setText} placeholder="Search the catalog by title or SKU" /></View>
            {search.isFetching && q ? <ActivityIndicator color={t.accent} /> : null}
            {searchResults.map((p) => candidateRow({ ...p, image: p.image }))}
            {q && !search.isFetching && !searchResults.length ? <Typography variant="caption" color={t.textSecondary}>No products match.</Typography> : null}
          </Panel>

          <Panel title="Add it to the catalog">
            <Typography variant="caption" color={t.textSecondary}>Opens the product editor filled in with the seller’s details, so you can tidy them before it goes live.</Typography>
            <Button label="Create product from this request" onPress={() => router.push({ pathname: '/ops/product', params: { requestId: r.id } })} />
          </Panel>

          <Panel title="Decline">
            <Field label="Reason (sent to the seller)" value={reason} onChangeText={setReason} multiline placeholder="e.g. Please send the exact model number and a photo of the box" style={styles.multiline} />
            <Button label="Decline request" variant="outline" onPress={onReject} loading={reject.isPending} disabled={reason.trim().length < 3} />
          </Panel>
        </>
      ) : (
        <Panel title="Outcome">
          <Typography variant="bodySm" color={t.textSecondary}>
            {status.label}{r.reviewedAt ? ` · ${formatDateTime(r.reviewedAt)}` : ''}
          </Typography>
          {r.reviewNote ? <Typography variant="bodySm">Note to seller: {r.reviewNote}</Typography> : null}
          {r.product && (
            <Button label={`Open “${r.product.title}”`} variant="outline" size="sm" onPress={() => router.push({ pathname: '/ops/product', params: { id: r.product!.id } })} />
          )}
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shrink: { flex: 1, minWidth: 0 },
  fill: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  photos: { gap: spacing.sm },
  photo: { width: 140, height: 140, borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  kv: { flexDirection: 'row', gap: spacing.md },
  kvLabel: { width: 90 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumbSm: { width: 44, height: 44, borderRadius: radius.sm, overflow: 'hidden' },
  searchWrap: { marginHorizontal: -spacing.md },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
});
