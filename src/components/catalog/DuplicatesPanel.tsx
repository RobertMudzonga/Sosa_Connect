import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Panel } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useOpsAction } from '@/src/hooks/useOps';
import { controlApi, useSimilarProducts } from '@/src/hooks/useControl';
import { getErrorMessage } from '@/src/utils/format';
import { confirmAction, notify } from '@/src/utils/notify';
import { radius, spacing } from '@/src/theme/spacing';

/** Admin product editor: likely duplicates by title, and merging this product into the master listing */
export function DuplicatesPanel({ productId, title }: { productId: string; title: string }) {
  const t = useMarketTheme();
  const router = useRouter();
  const [look, setLook] = useState(false);
  const { data, isLoading } = useSimilarProducts(look ? productId : undefined);
  const merge = useOpsAction((into: string) => controlApi.mergeProduct(productId, into));

  const onMerge = async (into: { id: string; title: string }) => {
    const ok = await confirmAction(`Merge into “${into.title}”?`, `“${title}” is archived; its offers move to the master product (a store with offers on both keeps one, with the stock added up). Old links open the master product.`, 'Merge', true);
    if (!ok) return;
    try {
      const r = await merge.mutateAsync(into.id);
      notify('Merged', `${r.offersMoved} offers moved, ${r.offersCombined} combined.`);
      router.replace({ pathname: '/ops/product', params: { id: into.id } });
    } catch (e) {
      notify('Could not merge', getErrorMessage(e));
    }
  };

  return (
    <Panel title="Duplicates">
      {!look ? (
        <Button label="Find likely duplicates" variant="ghost" size="sm" onPress={() => setLook(true)} />
      ) : isLoading ? (
        <Typography variant="caption" color={t.textSecondary}>Looking…</Typography>
      ) : !data?.length ? (
        <Typography variant="caption" color={t.textSecondary}>No products with a similar title.</Typography>
      ) : (
        <>
          <Typography variant="caption" color={t.textSecondary}>Merge this product into the master listing if they’re the same item.</Typography>
          {data.map((p) => (
            <View key={p.id} style={[styles.row, { borderColor: t.border }]}>
              <TouchableOpacity style={styles.flex} onPress={() => router.push({ pathname: '/ops/product', params: { id: p.id } })}>
                <Typography variant="bodySm" weight="semibold">{p.title}</Typography>
                <Typography variant="caption" color={t.textSecondary}>{Math.round(p.similarity * 100)}% similar · {p.offerCount} offers · {p.status.toLowerCase()}</Typography>
              </TouchableOpacity>
              <Button label="Merge into" size="sm" variant="outline" loading={merge.isPending && merge.variables === p.id} onPress={() => onMerge(p)} />
            </View>
          ))}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
});
