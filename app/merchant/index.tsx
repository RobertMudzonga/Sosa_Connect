import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Tag, Truck, Warehouse, Wallet, ChevronRight, ShieldAlert, FilePlus2, Store, ClipboardList, Users } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Panel, StatTile } from '@/src/components/merchant/ui';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useMySellerProfile, useMerchantDashboard, useMyBranches } from '@/src/hooks/useMerchant';
import { useMarketSettings } from '@/src/hooks/useOps';
import { useStoreMe, useStorePerformance } from '@/src/hooks/useStore';
import { useAuthStore } from '@/src/store/auth-store';
import { useMarketStore } from '@/src/store/market-store';
import { formatPrice, getErrorMessage } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

const KYC_COPY = {
  PENDING: { title: 'Your account is being verified', body: 'You can set up offers now. They go live once Kuwana approves your documents.' },
  REJECTED: { title: 'Verification was not approved', body: 'Update your details and contact seller support.' },
  SUSPENDED: { title: 'Your account is suspended', body: 'Your offers are hidden from buyers. Contact seller support.' },
} as const;

export default function MerchantHome() {
  const t = useMarketTheme();
  const router = useRouter();
  const currency = useMarketStore((s) => s.currency);
  const role = useAuthStore((s) => s.user?.role);
  const profile = useMySellerProfile();
  const { data, isLoading, error, refetch, isRefetching } = useMerchantDashboard(!!profile.data);
  const { data: branches } = useMyBranches(!!profile.data);
  const { data: settings } = useMarketSettings();
  const { data: store } = useStoreMe(!!profile.data);
  const { data: perf } = useStorePerformance(!!profile.data);

  // Branch staff work only from the order queue
  if (role === 'STORE_STAFF') return <Redirect href="/merchant/orders" />;

  if (profile.isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  if (profile.data === null) return <Redirect href="/merchant/onboarding" />;
  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        {error ? <Typography color={t.textSecondary}>{getErrorMessage(error)}</Typography> : <ActivityIndicator color={t.accent} />}
      </View>
    );
  }

  const kyc = data.seller.kycStatus !== 'APPROVED' ? KYC_COPY[data.seller.kycStatus] : null;
  const links = [
    { icon: Tag, label: 'My offers', hint: `${data.offers.active} active · ${data.offers.buyBoxWins} winning the Buy Box`, route: '/merchant/offers' },
    {
      icon: ClipboardList,
      label: 'Store orders',
      hint: store
        ? `${store.counts.new} new · ${store.counts.preparing} preparing · ${store.counts.ready} waiting for a driver${perf ? ` · ${perf.slaScore}% on time` : ''}`
        : 'Accept, pack and hand over orders',
      route: '/merchant/orders' as const,
    },
    // Legacy courier parcels (before stores fulfilled from branches); hidden once there are none
    ...(data.tasks.toDispatch || data.tasks.inTransit
      ? [{ icon: Truck, label: 'Courier parcels', hint: `${data.tasks.toDispatch} to dispatch · ${data.tasks.inTransit} on the way`, route: '/merchant/shipments' as const }]
      : []),
    {
      icon: Store,
      label: 'Store branches',
      hint: branches?.length ? `${branches.length} ${branches.length === 1 ? 'branch' : 'branches'} · ${branches.filter((b) => b.isOpenNow).length} open now` : 'Add a branch to start listing stock',
      route: '/merchant/branches' as const,
    },
    { icon: Users, label: 'Branch staff', hint: 'Counter staff who accept and pack orders', route: '/merchant/staff' as const },
    // Hub storage only exists while Kuwana runs hubs
    ...(settings?.hubsEnabled
      ? [{ icon: Warehouse, label: 'Send stock to a hub', hint: data.tasks.inboundOpen ? `${data.tasks.inboundOpen} open notices` : 'Let Kuwana store and deliver for you', route: '/merchant/inbound' as const }]
      : []),
    { icon: Wallet, label: 'Earnings & payouts', hint: 'Balances, payouts and statements', route: '/merchant/payouts' },
    {
      icon: FilePlus2,
      label: 'Product requests',
      hint: data.requests.readyToList ? `${data.requests.readyToList} added and ready for your offer`
        : data.requests.pending ? `${data.requests.pending} waiting for review`
        : 'Ask us to add products that aren’t in the catalog',
      route: '/merchant/requests',
    },
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.accent} />}
    >
      <View>
        <Typography variant="h2" weight="bold">{data.seller.businessName}</Typography>
        <Typography variant="caption" color={t.textSecondary}>
          {data.seller.plan === 'PRO' ? 'Pro merchant' : 'Starter merchant'} · on-time dispatch {data.seller.slaScore.toFixed(0)}%
          {data.seller.ratingCount ? ` · ${data.seller.ratingAvg.toFixed(1)}★ (${data.seller.ratingCount})` : ''}
        </Typography>
      </View>

      {kyc && (
        <View style={[styles.alert, { borderColor: t.warning, backgroundColor: t.surface }]}>
          <ShieldAlert size={18} color={t.warning} />
          <View style={styles.flex}>
            <Typography variant="bodySm" weight="bold">{kyc.title}</Typography>
            <Typography variant="caption" color={t.textSecondary}>{kyc.body}</Typography>
          </View>
        </View>
      )}

      <View style={styles.tiles}>
        <StatTile label="Available to withdraw" value={formatPrice(data.balances.available, currency)} tone="good" onPress={() => router.push('/merchant/payouts')} />
        <StatTile label="Pending" value={formatPrice(data.balances.pending, currency)} hint={`In escrow for ${data.balances.holdHours} h after delivery`} />
      </View>
      <View style={styles.tiles}>
        <StatTile label="To accept & pack" value={(store?.counts.new ?? 0) + (store?.counts.preparing ?? 0)} tone={store?.counts.new ? 'warn' : undefined}
          hint={store ? `${store.counts.new} new · ${store.counts.ready} waiting for a driver` : undefined} onPress={() => router.push('/merchant/orders')} />
        <StatTile label="Stock alerts" value={data.offers.outOfStock + data.offers.lowStock} tone={data.offers.outOfStock ? 'warn' : undefined}
          hint={`${data.offers.outOfStock} sold out · ${data.offers.lowStock} low`} onPress={() => router.push('/merchant/offers')} />
      </View>

      <Panel title="Last 30 days">
        <Typography variant="h3" weight="bold">{formatPrice(data.last30Days.sales, currency)}</Typography>
        <Typography variant="caption" color={t.textSecondary}>{data.last30Days.units} units sold</Typography>
      </Panel>

      <View style={styles.links}>
        {links.map((l) => (
          <TouchableOpacity key={l.route} onPress={() => router.push(l.route)} style={[styles.link, { backgroundColor: t.surface, borderColor: t.border }]}>
            <l.icon size={20} color={t.accent} />
            <View style={styles.flex}>
              <Typography variant="body" weight="semibold">{l.label}</Typography>
              <Typography variant="caption" color={t.textSecondary}>{l.hint}</Typography>
            </View>
            <ChevronRight size={18} color={t.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
      <Button label="Add a product" onPress={() => router.push('/merchant/new-offer')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  alert: { flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  links: { gap: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
});
