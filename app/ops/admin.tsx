import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Panel, StatTile, Tabs, usd } from '@/src/components/merchant/ui';
import { money } from '@/src/components/ops/OpsShipmentCard';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useAnalytics } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

const METHOD_LABEL: Record<string, string> = { ECOCASH: 'EcoCash', ONEMONEY: 'OneMoney', INNBUCKS: 'InnBucks', ZIMSWITCH: 'Zimswitch', CARD: 'Card', WALLET: 'Wallet', CASH: 'Cash on delivery' };
const FULFIL_LABEL: Record<string, string> = { PLATFORM_FULFILLED: 'Kuwana hubs', SELLER_FULFILLED: 'Sellers ship' };

/** Horizontal bar list: label, bar sized to share of the largest value, value */
function Bars({ rows, format = usd }: { rows: { label: string; value: number; sub?: string }[]; format?: (n: number) => string }) {
  const t = useMarketTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Typography variant="caption" color={t.textSecondary}>No sales in this period.</Typography>;
  return (
    <View style={styles.bars}>
      {rows.map((r) => (
        <View key={r.label} style={styles.barRow}>
          <Typography variant="caption" style={styles.barLabel} numberOfLines={1}>{r.label}</Typography>
          <View style={[styles.track, { backgroundColor: t.surfaceVariant }]}>
            <View style={[styles.fill, { width: `${(r.value / max) * 100}%`, backgroundColor: t.accent }]} />
          </View>
          <Typography variant="caption" weight="bold" style={styles.barValue}>{format(r.value)}</Typography>
        </View>
      ))}
    </View>
  );
}

export default function AdminOverview() {
  const t = useMarketTheme();
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const { data: a, isLoading, error, refetch, isRefetching } = useAnalytics(Number(days));

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.accent} />}
    >
      <Tabs value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
      {isLoading || !a ? (
        error ? <Typography color={t.textSecondary}>{getErrorMessage(error)}</Typography> : <ActivityIndicator color={t.accent} />
      ) : (
        <>
          <View style={styles.tiles}>
            <StatTile label="GMV" value={usd(a.totals.gmvUsd)} hint={`${a.totals.orders} orders`} />
            <StatTile label="Kuwana revenue" value={usd(a.revenue.totalUsd)} tone="good" hint={a.totals.gmvUsd ? `${((a.revenue.totalUsd / a.totals.gmvUsd) * 100).toFixed(1)}% take rate` : undefined} />
          </View>
          <View style={styles.tiles}>
            <StatTile label="Average order" value={usd(a.totals.averageOrderUsd)} />
            <StatTile label="Cancelled" value={`${a.totals.cancellationRate}%`} tone={a.totals.cancellationRate > 10 ? 'warn' : undefined} hint={`${a.totals.cancelledOrders} orders`} />
          </View>
          <View style={styles.tiles}>
            <StatTile label="Returns" value={a.totals.returns} hint={`${usd(a.totals.refundedUsd)} refunded`} />
            <StatTile label="Cash not yet banked" value={a.codOutstanding.length ? a.codOutstanding.map((c) => money(c.amount, c.currency as 'USD' | 'ZWG')).join(' + ') : '$0.00'}
              tone={a.codOutstanding.length ? 'warn' : undefined} hint={`${a.codOutstanding.reduce((n, c) => n + c.collections, 0)} collections`} />
          </View>

          <Panel title="GMV by day">
            <View style={styles.chart}>
              {a.daily.map((d) => {
                const max = Math.max(1, ...a.daily.map((x) => x.gmvUsd));
                return <View key={d.day} style={[styles.col, { height: `${Math.max(2, (d.gmvUsd / max) * 100)}%`, backgroundColor: t.accent }]} accessibilityLabel={`${d.day}: ${usd(d.gmvUsd)}`} />;
              })}
            </View>
            <Typography variant="caption" color={t.textSecondary}>
              {a.daily.length ? `${a.daily[0].day} to ${a.daily[a.daily.length - 1].day}` : 'No sales yet'}
            </Typography>
          </Panel>

          <Panel title="Revenue">
            <Bars rows={[
              { label: 'Commission & fees', value: a.revenue.commissionAndFeesUsd },
              { label: 'Delivery', value: a.revenue.deliveryUsd },
              { label: 'COD fees', value: a.revenue.codFeesUsd },
            ]} />
          </Panel>
          <Panel title="By category"><Bars rows={a.byCategory.map((c) => ({ label: c.name, value: c.gmvUsd }))} /></Panel>
          <Panel title="Top sellers"><Bars rows={a.topSellers.map((s) => ({ label: s.firstParty ? `${s.name} (1P)` : s.name, value: s.gmvUsd }))} /></Panel>
          <Panel title="Payment methods"><Bars rows={a.byPaymentMethod.map((m) => ({ label: METHOD_LABEL[m.key] ?? m.key, value: m.gmvUsd }))} /></Panel>
          <Panel title="Fulfilment"><Bars rows={a.byFulfilment.map((f) => ({ label: FULFIL_LABEL[f.key] ?? f.key, value: f.gmvUsd }))} /></Panel>
          <Panel title="Paid in"><Bars rows={a.byCurrency.map((c) => ({ label: c.key === 'ZWG' ? 'ZiG' : 'USD', value: c.orders }))} format={(n) => `${n} orders`} /></Panel>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  tiles: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  bars: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 110 },
  track: { flex: 1, height: 10, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  barValue: { width: 76, textAlign: 'right' },
  chart: { height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, minWidth: 2 },
});
