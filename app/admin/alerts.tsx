import React from 'react';
import { View, StyleSheet, FlatList, Linking, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, MapPin } from 'lucide-react-native';
import { Typography } from '@/src/components/common/Typography';
import { Button } from '@/src/components/common/Button';
import { Card } from '@/src/components/common/Card';
import { theme, palette } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/src/services/api';
import { formatDateTime, getErrorMessage } from '@/src/utils/format';
import { notify } from '@/src/utils/notify';

interface EmergencyAlert {
  id: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  user?: { email: string; phone?: string | null; profile?: { fullName: string } | null } | null;
}

export default function AdminAlertsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const queryClient = useQueryClient();
  const { data: alerts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'emergency-alerts'],
    refetchInterval: 15000,
    queryFn: async () => (await api.get('/emergency/alerts')).data.data as EmergencyAlert[],
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => api.patch(`/emergency/alerts/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'emergency-alerts'] }),
    onError: (error) => notify('Could not resolve', getErrorMessage(error)),
  });

  return (
    <FlatList
      style={{ backgroundColor: activeTheme.background }}
      contentContainerStyle={styles.list}
      data={alerts ?? []}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={activeTheme.primary} />}
      renderItem={({ item }) => (
        <Card variant="outlined" style={[styles.card, { borderColor: palette.danger }]}>
          <Typography variant="body" weight="bold">{item.user?.profile?.fullName ?? 'Signed-out user'}</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>{formatDateTime(item.createdAt)}</Typography>
          {item.lat != null && item.lng != null ? (
            <Button
              label={`Open location${item.accuracy ? ` (±${Math.round(item.accuracy)} m)` : ''}`}
              variant="ghost"
              size="sm"
              icon={<MapPin size={14} color={activeTheme.primary} />}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.lat},${item.lng}`)}
              style={styles.inlineBtn}
            />
          ) : (
            <Typography variant="caption" color={activeTheme.textSecondary}>No location shared</Typography>
          )}
          <View style={styles.actions}>
            {!!item.user?.phone && (
              <Button
                label="Call"
                variant="outline"
                size="sm"
                icon={<Phone size={14} color={activeTheme.primary} />}
                onPress={() => Linking.openURL(`tel:${item.user!.phone}`)}
              />
            )}
            <Button label="Mark resolved" variant="primary" size="sm" loading={resolve.isPending} onPress={() => resolve.mutate(item.id)} />
          </View>
        </Card>
      )}
      ListEmptyComponent={
        <Typography align="center" color={activeTheme.textSecondary} style={{ marginTop: 60 }}>
          {isLoading ? 'Loading…' : 'No open SOS alerts.'}
        </Typography>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: { padding: spacing.md, gap: 4 },
  inlineBtn: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
});
