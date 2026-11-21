import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Panel, Pill } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMyBranches, useUpdateBranch, StoreBranch } from '@/src/hooks/useMerchant';
import { getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';
import { spacing } from '@/src/theme/spacing';

function hoursHint(b: StoreBranch) {
  if (!b.isActive) return 'Closed permanently';
  if (b.isPaused) return 'Paused: not taking orders';
  if (b.isOpenNow) return 'Open now';
  if (b.opensAt) {
    const d = new Date(b.opensAt);
    return `Opens ${d.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;
  }
  return 'No opening hours set';
}

/** The store's physical branches. Each holds its own stock; drivers collect orders from here. */
export default function Branches() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data, isLoading, error } = useMyBranches();
  const update = useUpdateBranch();

  const togglePause = async (b: StoreBranch, paused: boolean) => {
    try {
      await update.mutateAsync({ id: b.id, isPaused: paused });
    } catch (e) {
      notify('Could not update the branch', getErrorMessage(e));
    }
  };

  if (isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll}>
      <Typography variant="bodySm" color={t.textSecondary}>
        Kuwana has no warehouses: orders are packed at your branches and collected by nearby drivers. Buyers see the open branch closest to them first.
      </Typography>
      {error && <Typography color={t.error}>{getErrorMessage(error)}</Typography>}

      {(data ?? []).map((b) => (
        <Panel
          key={b.id}
          title={`${b.name} · ${b.code}`}
          right={<Pill label={hoursHint(b)} tone={!b.isActive || b.isPaused ? 'bad' : b.isOpenNow ? 'good' : 'warn'} />}
        >
          <View style={styles.inline}>
            <MapPin size={14} color={t.textSecondary} />
            <Typography variant="bodySm" style={styles.flex}>
              {b.address}{b.suburb ? `, ${b.suburb.name}` : ''}, {b.city.name}
            </Typography>
          </View>
          {b.landmark && <Typography variant="caption" color={t.textSecondary}>{b.landmark}</Typography>}
          <Typography variant="caption" color={t.textSecondary}>
            {b.activeOfferCount} products listed · {b.defaultPrepTimeMins} min to pack
          </Typography>
          {b.isActive && (
            <View style={styles.switchRow}>
              <Typography variant="bodySm" weight="semibold" style={styles.flex}>Taking orders</Typography>
              <Switch value={!b.isPaused} onValueChange={(v) => togglePause(b, !v)} disabled={update.isPending} />
            </View>
          )}
          <TouchableOpacity onPress={() => router.push({ pathname: '/merchant/branch', params: { id: b.id } })}>
            <Typography variant="bodySm" weight="bold" color={t.accent}>Edit branch</Typography>
          </TouchableOpacity>
        </Panel>
      ))}

      {data?.length === 0 && (
        <Typography variant="body" color={t.textSecondary} align="center">
          Add your first branch to start listing stock.
        </Typography>
      )}
      <Button label="Add a branch" onPress={() => router.push('/merchant/branch')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
});
