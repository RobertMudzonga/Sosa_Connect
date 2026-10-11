import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePendingProviders, useApproveProvider } from '@/src/hooks/useProviders';
import { ShieldCheck, XCircle, MapPin, Phone } from 'lucide-react-native';
import { confirmAction, notify } from '@/src/utils/notify';
import { getErrorMessage } from '@/src/utils/format';

export default function ApprovalsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: pending, isLoading, refetch } = usePendingProviders();
  const approveMutation = useApproveProvider();

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const verb = status === 'APPROVED' ? 'Approve' : 'Reject';
    const confirmed = await confirmAction(
      `${verb} Seller`,
      `Are you sure you want to ${verb.toLowerCase()} this seller?`,
      verb,
      status === 'REJECTED',
    );
    if (!confirmed) return;
    try {
      await approveMutation.mutateAsync({ id, status });
      notify('Success', `Seller has been ${status.toLowerCase()}`);
    } catch (error) {
      notify('Action failed', getErrorMessage(error));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card variant="elevated" style={styles.providerCard}>
      <View style={styles.cardHeader}>
        <View>
          <Typography variant="h3" weight="bold">{item.businessName}</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>{item.category}</Typography>
        </View>
        <View style={[styles.badge, { backgroundColor: activeTheme.surfaceVariant }]}>
          <Typography variant="caption" weight="bold">PENDING</Typography>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MapPin size={14} color={activeTheme.textSecondary} />
        <Typography variant="bodySm" color={activeTheme.textSecondary} style={{ marginLeft: 4 }}>
          {[item.city, item.country].filter(Boolean).join(', ') || 'No location'}
        </Typography>
      </View>

      <View style={styles.infoRow}>
        <Phone size={14} color={activeTheme.textSecondary} />
        <Typography variant="bodySm" color={activeTheme.textSecondary} style={{ marginLeft: 4 }}>
          {item.phone || 'No phone'}
        </Typography>
      </View>

      <Typography variant="bodySm" style={styles.description} numberOfLines={2}>
        {item.description || 'No description provided.'}
      </Typography>

      <View style={styles.actions}>
        <Button 
          label="Reject"
          variant="outline" 
          size="sm" 
          style={styles.actionBtn}
          icon={<XCircle size={16} color={palette.danger} />}
          onPress={() => handleAction(item.id, 'REJECTED')}
        />
        <Button 
          label="Approve"
          variant="primary" 
          size="sm" 
          style={styles.actionBtn}
          icon={<ShieldCheck size={16} color="#fff" />}
          onPress={() => handleAction(item.id, 'APPROVED')}
        />
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <FlatList
        data={pending}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <ShieldCheck size={48} color={activeTheme.textSecondary} />
              <Typography variant="body" color={activeTheme.textSecondary} style={{ marginTop: 12 }}>
                No pending approvals
              </Typography>
            </View>
          ) : null
        }
        refreshing={isLoading}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
  },
  providerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    marginVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  }
});
