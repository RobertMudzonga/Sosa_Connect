import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Typography } from '../common/Typography';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { theme, palette } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Package, Plus, TrendingUp, AlertCircle, Edit3, MoreVertical } from 'lucide-react-native';

const MOCK_INVENTORY = [
  { id: '1', title: 'Solar Inverter 5kVA', price: 450, stock: 12, status: 'IN_STOCK' },
  { id: '2', title: 'Deep Cycle Battery', price: 280, stock: 3, status: 'LOW_STOCK' },
  { id: '3', title: '100W Solar Panel', price: 85, stock: 0, status: 'OUT_OF_STOCK' },
  { id: '4', title: 'Charge Controller', price: 120, stock: 25, status: 'IN_STOCK' },
];

export const InventoryManager: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return palette.success;
      case 'LOW_STOCK': return palette.warning;
      case 'OUT_OF_STOCK': return palette.danger;
      default: return activeTheme.textSecondary;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card variant="elevated" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleGroup}>
          <View style={[styles.packageIcon, { backgroundColor: activeTheme.surfaceVariant }]}>
            <Package size={20} color={activeTheme.primary} />
          </View>
          <View>
            <Typography variant="body" weight="bold">{item.title}</Typography>
            <Typography variant="caption" color={activeTheme.textSecondary}>ID: #{item.id}</Typography>
          </View>
        </View>
        <TouchableOpacity>
          <MoreVertical size={20} color={activeTheme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.itemStats}>
        <View style={styles.stat}>
          <Typography variant="caption" color={activeTheme.textSecondary}>Price</Typography>
          <Typography variant="body" weight="bold">USD {item.price}</Typography>
        </View>
        <View style={styles.stat}>
          <Typography variant="caption" color={activeTheme.textSecondary}>Stock</Typography>
          <Typography variant="body" weight="bold" color={getStatusColor(item.status)}>{item.stock}</Typography>
        </View>
        <View style={styles.stat}>
          <Typography variant="caption" color={activeTheme.textSecondary}>Status</Typography>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Typography variant="caption" weight="bold" style={{ color: getStatusColor(item.status), fontSize: 9 }}>
              {item.status.replace(/_/g, ' ')}
            </Typography>
          </View>
        </View>
      </View>

      <View style={styles.itemActions}>
        <Button 
          label="Edit Price" 
          variant="outline" 
          size="sm" 
          style={styles.actionBtn}
          icon={<Edit3 size={14} color={activeTheme.primary} />}
        />
        <Button 
          label="Restock" 
          variant="secondary" 
          size="sm" 
          style={styles.actionBtn}
          icon={<Plus size={14} color={activeTheme.primary} />}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <Card variant="flat" style={styles.miniStat}>
          <TrendingUp size={20} color={palette.success} />
          <Typography variant="h3" weight="bold">1.2k</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>Total Sales</Typography>
        </Card>
        <Card variant="flat" style={styles.miniStat}>
          <AlertCircle size={20} color={palette.warning} />
          <Typography variant="h3" weight="bold">2</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>Low Stock</Typography>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Typography variant="h3" weight="bold">Your Inventory</Typography>
        <Button 
          label="Add Product" 
          variant="primary" 
          size="sm" 
          icon={<Plus size={16} color="#fff" />} 
        />
      </View>

      <FlatList
        data={MOCK_INVENTORY}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  miniStat: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
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
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemTitleGroup: {
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
    borderColor: 'rgba(0,0,0,0.05)',
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
  }
});
