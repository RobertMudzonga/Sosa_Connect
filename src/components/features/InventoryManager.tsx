import React from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Package, Plus, TrendingUp, AlertCircle, Edit3, ClipboardList, Settings, Store } from 'lucide-react-native';
import { useMyProvider, useMyProviderStats } from '../../hooks/useProviders';
import { useServices, useUpdateService, Service } from '../../hooks/useServices';
import { formatMoney, getErrorMessage } from '../../utils/format';
import { notify } from '../../utils/notify';

const LOW_STOCK_THRESHOLD = 5;

type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE' | 'MADE_TO_ORDER';

const getStockStatus = (item: Service): StockStatus => {
  if (item.isAvailable === false) return 'UNAVAILABLE';
  if (item.stock === null || item.stock === undefined) return 'MADE_TO_ORDER';
  if (item.stock <= 0) return 'OUT_OF_STOCK';
  if (item.stock <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'IN_STOCK';
};

export const InventoryManager: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const router = useRouter();

  const { data: provider, isLoading: loadingProvider } = useMyProvider();
  const { data: stats } = useMyProviderStats(!!provider);
  const { data: inventory, isLoading: loadingInventory } = useServices(
    { providerId: provider?.id },
    { enabled: !!provider },
  );
  const updateService = useUpdateService();

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'IN_STOCK':
      case 'MADE_TO_ORDER': return palette.success;
      case 'LOW_STOCK': return palette.warning;
      case 'OUT_OF_STOCK':
      case 'UNAVAILABLE': return palette.danger;
      default: return activeTheme.textSecondary;
    }
  };

  const toggleAvailability = async (item: Service) => {
    try {
      await updateService.mutateAsync({ id: item.id, isAvailable: item.isAvailable === false });
    } catch (error) {
      notify('Could not update item', getErrorMessage(error));
    }
  };

  if (loadingProvider) {
    return <ActivityIndicator style={{ marginTop: spacing.xl }} color={activeTheme.primary} />;
  }

  if (!provider) {
    return (
      <View style={styles.container}>
        <Card variant="flat" style={styles.emptyCard}>
          <Store size={32} color={activeTheme.primary} />
          <Typography variant="h3" weight="bold" align="center">You don&apos;t have a store yet</Typography>
          <Typography variant="bodySm" color={activeTheme.textSecondary} align="center">
            Seller accounts are created and approved by the Kuwana team. Contact support to open a store.
          </Typography>
        </Card>
      </View>
    );
  }

  const items = inventory ?? [];
  const lowStockCount = items.filter((i) => {
    const status = getStockStatus(i);
    return status === 'LOW_STOCK' || status === 'OUT_OF_STOCK';
  }).length;

  const renderItem = (item: Service) => {
    const status = getStockStatus(item);
    const statusColor = getStatusColor(status);
    return (
      <Card key={item.id} variant="elevated" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleGroup}>
            <View style={[styles.packageIcon, { backgroundColor: activeTheme.surfaceVariant }]}>
              <Package size={20} color={activeTheme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="body" weight="bold" numberOfLines={1}>{item.title}</Typography>
              <Typography variant="caption" color={activeTheme.textSecondary}>
                {item.section || item.category}
              </Typography>
            </View>
          </View>
        </View>

        <View style={[styles.itemStats, { borderColor: activeTheme.border }]}>
          <View style={styles.stat}>
            <Typography variant="caption" color={activeTheme.textSecondary}>Price</Typography>
            <Typography variant="body" weight="bold">{formatMoney(item.price, item.currency)}</Typography>
          </View>
          <View style={styles.stat}>
            <Typography variant="caption" color={activeTheme.textSecondary}>Stock</Typography>
            <Typography variant="body" weight="bold" color={statusColor}>
              {item.stock ?? '—'}
            </Typography>
          </View>
          <View style={styles.stat}>
            <Typography variant="caption" color={activeTheme.textSecondary}>Status</Typography>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Typography variant="caption" weight="bold" style={{ color: statusColor, fontSize: 9 }}>
                {status.replace(/_/g, ' ')}
              </Typography>
            </View>
          </View>
        </View>

        <View style={styles.itemActions}>
          <Button
            label="Edit"
            variant="outline"
            size="sm"
            style={styles.actionBtn}
            icon={<Edit3 size={14} color={activeTheme.primary} />}
            onPress={() => router.push({ pathname: '/seller/product/[id]', params: { id: item.id } })}
          />
          <Button
            label={item.isAvailable === false ? 'Mark available' : 'Mark unavailable'}
            variant="secondary"
            size="sm"
            style={styles.actionBtn}
            onPress={() => toggleAvailability(item)}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <Card variant="flat" style={styles.miniStat}>
          <TrendingUp size={20} color={palette.success} />
          <Typography variant="h3" weight="bold">
            {stats ? formatMoney(stats.revenueToday, stats.currency) : '—'}
          </Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>
            Sales today{stats ? ` · ${stats.ordersToday} orders` : ''}
          </Typography>
        </Card>
        <Card variant="flat" style={styles.miniStat}>
          <AlertCircle size={20} color={palette.warning} />
          <Typography variant="h3" weight="bold">{lowStockCount}</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>Low / out of stock</Typography>
        </Card>
      </View>

      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={[styles.quickLink, { backgroundColor: activeTheme.surfaceVariant }]}
          onPress={() => router.push('/seller/orders')}
        >
          <ClipboardList size={18} color={activeTheme.primary} />
          <Typography variant="bodySm" weight="semibold">
            Orders{stats?.pendingOrders ? ` (${stats.pendingOrders} new)` : ''}
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickLink, { backgroundColor: activeTheme.surfaceVariant }]}
          onPress={() => router.push('/seller/settings')}
        >
          <Settings size={18} color={activeTheme.primary} />
          <Typography variant="bodySm" weight="semibold">Store settings</Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Typography variant="h3" weight="bold">Your Inventory</Typography>
        <Button
          label="Add Product"
          variant="primary"
          size="sm"
          icon={<Plus size={16} color="#fff" />}
          onPress={() => router.push('/seller/product/new')}
        />
      </View>

      {loadingInventory ? (
        <ActivityIndicator color={activeTheme.primary} />
      ) : items.length === 0 ? (
        <Typography variant="bodySm" color={activeTheme.textSecondary} align="center">
          No products yet. Tap “Add Product” to create your first listing.
        </Typography>
      ) : (
        <View style={styles.list}>{items.map(renderItem)}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  miniStat: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  packageIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
