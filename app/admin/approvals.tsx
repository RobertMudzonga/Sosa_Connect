import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { theme, palette } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePendingProviders, useApproveProvider } from '@/src/hooks/useProviders';
import { ShieldCheck, XCircle, MapPin, Phone } from 'lucide-react-native';

export default function ApprovalsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { data: pending, isLoading, refetch } = usePendingProviders();
  const approveMutation = useApproveProvider();

  const handleAction = (id: string, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      `${status === 'APPROVED' ? 'Approve' : 'Reject'} Seller`,
      `Are you sure you want to ${status.toLowerCase()} this seller?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: status === 'APPROVED' ? 'Approve' : 'Reject', 
          style: status === 'APPROVED' ? 'default' : 'destructive',
          onPress: async () => {
            await approveMutation.mutateAsync({ id, status });
            Alert.alert('Success', `Seller has been ${status.toLowerCase()}`);
          }
        }
      ]
    );
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
          {item.city}, {item.country}
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
          variant="outline" 
          size="sm" 
          style={styles.actionBtn}
          onPress={() => handleAction(item.id, 'REJECTED')}
        >
          <XCircle size={16} color={palette.danger} style={{ marginRight: 4 }} />
          <Typography variant="bodySm" weight="bold" style={{ color: palette.danger }}>Reject</Typography>
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          style={styles.actionBtn}
          onPress={() => handleAction(item.id, 'APPROVED')}
        >
          <ShieldCheck size={16} color="#fff" style={{ marginRight: 4 }} />
          <Typography variant="bodySm" weight="bold" style={{ color: '#fff' }}>Approve</Typography>
        </Button>
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
