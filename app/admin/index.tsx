import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePendingProviders } from '@/src/hooks/useProviders';

export default function AdminDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: pendingProviders, isLoading, isError, error } = usePendingProviders();

  const menuItems = [
    {
      id: 'approvals',
      title: 'Seller Approvals',
      description: `${pendingProviders?.length ?? 0} pending requests`,
      letter: 'A',
      color: palette.primary[600],
      route: '/admin/approvals',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Create buyers & sellers',
      letter: 'U',
      color: palette.secondary[600],
      route: '/admin/users',
    },
    {
      id: 'inventory',
      title: 'Global Inventory',
      description: 'Add marketplace items',
      letter: 'I',
      color: palette.neutral[600],
      route: '/admin/inventory',
    },
    {
      id: 'orders',
      title: 'Orders & Refunds',
      description: 'Monitor orders, cancel, refund',
      letter: 'O',
      color: palette.info,
      route: '/admin/orders',
    },
    {
      id: 'alerts',
      title: 'SOS Alerts',
      description: 'Open emergency alerts from users',
      letter: '!',
      color: palette.danger,
      route: '/admin/alerts',
    },
    {
      id: 'settings',
      title: 'Fees & Commission',
      description: 'Platform commission, service fee, tax',
      letter: 'F',
      color: palette.warning,
      route: '/admin/settings',
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={styles.header}>
        <Typography variant="h1" weight="bold">Overview</Typography>
        <Typography variant="body" color={activeTheme.textSecondary}>System status & management</Typography>
      </View>

      {isLoading ? (
        <View style={styles.messageBox}>
          <Typography variant="body" color={activeTheme.textSecondary}>Loading admin dashboard…</Typography>
        </View>
      ) : null}

      {isError ? (
        <View style={[styles.messageBox, { borderColor: palette.danger, borderWidth: 1 }]}> 
          <Typography variant="body" color={palette.danger}>Failed to load admin data.</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>{String(error?.message)}</Typography>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <Card variant="flat" style={[styles.statCard, { backgroundColor: activeTheme.surfaceVariant }]}> 
          <Typography variant="caption" color={activeTheme.textSecondary}>Total Sales</Typography>
          <Typography variant="h2" weight="bold">$4,250</Typography>
        </Card>
        <Card variant="flat" style={[styles.statCard, { backgroundColor: activeTheme.surfaceVariant }]}> 
          <Typography variant="caption" color={activeTheme.textSecondary}>Active Sellers</Typography>
          <Typography variant="h2" weight="bold">124</Typography>
        </Card>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <Card style={styles.menuCard}>
              <View style={styles.menuContent}>
                <View style={[styles.iconBox, { backgroundColor: item.color }]}> 
                  <Typography variant="h3" weight="bold" color="#fff">{item.letter}</Typography>
                </View>
                <View style={styles.menuText}>
                  <Typography variant="h3" weight="bold">{item.title}</Typography>
                  <Typography variant="caption" color={activeTheme.textSecondary}>{item.description}</Typography>
                </View>
                <Typography variant="h3" color={activeTheme.textSecondary}>›</Typography>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Typography variant="h2" weight="bold" style={styles.sectionTitle}>Recent Activity</Typography>
        <Card variant="outlined" style={styles.activityCard}>
          <View style={styles.activityItem}>
            <Typography variant="h2" weight="bold" color={palette.warning}>!</Typography>
            <Typography variant="bodySm" style={{ flex: 1, marginLeft: 8, color: activeTheme.text }}>
              New seller onboarded: Emmanuel&apos;s Auto Parts
            </Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>2h ago</Typography>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  menuGrid: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuCard: {
    padding: spacing.md,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  activityCard: {
    padding: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageBox: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
