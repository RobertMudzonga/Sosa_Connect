import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { REQUEST_STATUS } from '@/src/components/catalog/requestStatus';
import { useMyProductRequests, useCancelProductRequest, ProductRequest } from '@/src/hooks/useMerchant';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify, confirmAction } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

export default function MyProductRequests() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useMyProductRequests();
  const cancel = useCancelProductRequest();

  const onCancel = async (r: ProductRequest) => {
    if (!(await confirmAction('Cancel this request?', `“${r.title}” will be removed from the review queue.`, 'Cancel request', true))) return;
    try {
      await cancel.mutateAsync(r.id);
    } catch (e) {
      notify('Could not cancel', getErrorMessage(e));
    }
  };

  const renderItem = ({ item: r }: { item: ProductRequest }) => {
    const status = REQUEST_STATUS[r.status];
    const ready = (r.status === 'APPROVED' || r.status === 'DUPLICATE') && r.product?.status === 'ACTIVE';
    return (
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={styles.row}>
          <View style={[styles.thumb, { backgroundColor: t.surfaceVariant }]}>
            {r.images[0] ? <Image source={{ uri: r.images[0].url }} style={styles.fill} contentFit="contain" /> : null}
          </View>
          <View style={styles.flex}>
            <Typography variant="bodySm" weight="semibold" numberOfLines={2}>{r.title}</Typography>
            <Typography variant="caption" color={t.textSecondary}>Sent {formatDateTime(r.createdAt)}</Typography>
          </View>
          <Pill label={status.label} tone={status.tone} />
        </View>

        {r.status === 'DUPLICATE' && r.product && (
          <Typography variant="caption" color={t.textSecondary}>It’s already listed as “{r.product.title}”.</Typography>
        )}
        {r.reviewNote ? (
          <Typography variant="caption" color={r.status === 'REJECTED' ? t.error : t.textSecondary}>Kuwana: {r.reviewNote}</Typography>
        ) : null}
        {(r.status === 'APPROVED' || r.status === 'DUPLICATE') && r.product && !ready && (
          <Typography variant="caption" color={t.textSecondary}>The product is being prepared and will open for offers soon.</Typography>
        )}

        {ready && (
          <Button label="Add your offer" size="sm" onPress={() => router.push({ pathname: '/merchant/new-offer', params: { productId: r.product!.id } })} />
        )}
        {r.status === 'REJECTED' && (
          <Button label="Send a new request" size="sm" variant="outline" onPress={() => router.push({ pathname: '/merchant/request-product', params: { title: r.title } })} />
        )}
        {r.status === 'PENDING' && (
          <Button label="Cancel request" size="sm" variant="ghost" onPress={() => onCancel(r)} loading={cancel.isPending && cancel.variables === r.id} />
        )}
      </View>
    );
  };

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.list}
      data={data ?? []}
      keyExtractor={(r) => r.id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={renderItem}
      ListHeaderComponent={
        <Button label="Request a new product" variant="outline" onPress={() => router.push('/merchant/request-product')} />
      }
      ListEmptyComponent={
        isLoading ? <ActivityIndicator color={t.accent} style={styles.empty} /> : (
          <Typography variant="bodySm" color={t.textSecondary} align="center" style={styles.empty}>
            No requests yet. If a product you sell isn’t in the catalog, request it here.
          </Typography>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  empty: { marginTop: 60 },
});
