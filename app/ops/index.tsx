import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { PackageOpen, Boxes, Truck, Store, Banknote, Undo2, BarChart3, ShieldCheck, Wallet, SlidersHorizontal, Users, ChevronRight, Tag, BookOpen, FilePlus2, Radar, Scale, Map, MapPinned } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';
import { useStaffMe, StaffRole } from '@/src/hooks/useOps';
import { getErrorMessage } from '@/src/utils/format';
import { radius, spacing } from '@/src/theme/spacing';

type Tool = { route: string; label: string; hint: string; icon: typeof Truck; roles: StaffRole[] };

const TOOLS: Tool[] = [
  { route: '/ops/admin', label: 'Marketplace overview', hint: 'Sales, revenue and what needs attention', icon: BarChart3, roles: ['ADMIN'] },
  { route: '/ops/dispatch', label: 'Live dispatch', hint: 'Late parcels: move to another store, re-offer to drivers, cancel', icon: Radar, roles: ['ADMIN'] },
  { route: '/ops/disputes', label: 'Disputes', hint: 'Settle returns with one-tap refunds; freeze store earnings', icon: Scale, roles: ['ADMIN'] },
  { route: '/ops/receiving', label: 'Receive stock', hint: 'Count in sellers’ inbound deliveries', icon: Boxes, roles: ['WAREHOUSE', 'ADMIN'] },
  { route: '/ops/hub', label: 'Pick, pack & dispatch', hint: 'Today’s parcels, pick list, drivers and couriers', icon: PackageOpen, roles: ['WAREHOUSE', 'ADMIN'] },
  { route: '/ops/driver', label: 'My deliveries', hint: 'Hand over with the PIN, collect cash', icon: Truck, roles: ['DRIVER'] },
  { route: '/ops/pickup', label: 'Pickup counter', hint: 'Arrivals, collections and return drop-offs', icon: Store, roles: ['PICKUP_AGENT'] },
  { route: '/ops/cod', label: 'Cash-up', hint: 'Count drivers’ cash-on-delivery takings', icon: Banknote, roles: ['WAREHOUSE', 'ADMIN'] },
  { route: '/ops/returns', label: 'Returns', hint: 'Receive and inspect returned items', icon: Undo2, roles: ['WAREHOUSE', 'ADMIN'] },
  { route: '/ops/catalog', label: 'Catalog', hint: 'Add and edit products, photos, specs and categories', icon: BookOpen, roles: ['ADMIN'] },
  { route: '/ops/requests', label: 'Product requests', hint: 'Sellers asking for products to be added', icon: FilePlus2, roles: ['ADMIN'] },
  { route: '/ops/sellers', label: 'Store verification', hint: 'ID, payout accounts and branch pins; payout holds', icon: ShieldCheck, roles: ['ADMIN'] },
  { route: '/ops/drivers', label: 'Drivers', hint: 'Applications, parcel limits, cash float top-ups and withdrawals', icon: Truck, roles: ['ADMIN'] },
  { route: '/ops/locations', label: 'Towns, suburbs & zones', hint: 'Where Kuwana delivers and the zone price matrix', icon: Map, roles: ['ADMIN'] },
  { route: '/ops/pickup-points', label: 'Pickup points', hint: 'Partner counters, daily capacity and agent fees', icon: MapPinned, roles: ['ADMIN'] },
  { route: '/ops/fees', label: 'Distance fees', hint: 'Fallback buyer fee and driver pay by vehicle and distance', icon: SlidersHorizontal, roles: ['ADMIN'] },
  { route: '/ops/payouts', label: 'Seller payouts', hint: 'Approve and record bank transfers', icon: Wallet, roles: ['ADMIN'] },
  { route: '/ops/settings', label: 'Rates & rules', hint: 'ZiG rate, delivery fees, COD limits, commissions', icon: SlidersHorizontal, roles: ['ADMIN'] },
  { route: '/ops/staff', label: 'Staff', hint: 'Hub staff, drivers and pickup agents', icon: Users, roles: ['ADMIN'] },
  { route: '/merchant', label: 'Kuwana Retail stock', hint: 'Our own offers, via the seller portal', icon: Tag, roles: ['ADMIN'] },
];

const ROLE_LABEL: Record<StaffRole, string> = { ADMIN: 'Admin', WAREHOUSE: 'Hub team', DRIVER: 'Driver', PICKUP_AGENT: 'Pickup agent' };

export default function OpsHome() {
  const t = useMarketTheme();
  const router = useRouter();
  const { data: me, isLoading, error } = useStaffMe();

  if (isLoading) return <View style={[styles.center, { backgroundColor: t.background }]}><ActivityIndicator color={t.accent} /></View>;
  if (!me) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <Typography color={t.textSecondary} align="center">{getErrorMessage(error, 'This area is for Kuwana staff')}</Typography>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll}>
      <View>
        <Typography variant="h2" weight="bold">{me.name}</Typography>
        <Typography variant="caption" color={t.textSecondary}>
          {ROLE_LABEL[me.role]}{me.hub ? ` · ${me.hub.name}` : ''}{me.pickupPoint ? ` · ${me.pickupPoint.name}` : ''}
        </Typography>
      </View>
      {TOOLS.filter((tool) => tool.roles.includes(me.role)).map((tool) => (
        <TouchableOpacity key={tool.route} onPress={() => router.push(tool.route as never)} style={[styles.tool, { backgroundColor: t.surface, borderColor: t.border }]}>
          <tool.icon size={22} color={t.accent} />
          <View style={styles.flex}>
            <Typography variant="body" weight="semibold">{tool.label}</Typography>
            <Typography variant="caption" color={t.textSecondary}>{tool.hint}</Typography>
          </View>
          <ChevronRight size={18} color={t.textSecondary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  tool: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
});
