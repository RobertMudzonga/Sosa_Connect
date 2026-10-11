import React from 'react';
import { View, StyleSheet, Switch, Platform } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { theme } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/src/store/app-store';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const { notificationsEnabled, setNotificationsEnabled } = useAppStore();

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <Card variant="flat" style={styles.row}>
        <View style={{ flex: 1 }}>
          <Typography variant="body" weight="bold">Push notifications</Typography>
          <Typography variant="caption" color={activeTheme.textSecondary}>
            Order updates, delivery progress and, for sellers, new orders.
          </Typography>
        </View>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </Card>
      {Platform.OS === 'web' && (
        <Typography variant="caption" color={activeTheme.textSecondary} style={{ marginTop: spacing.md }}>
          Push notifications are only available in the mobile app. On the web, open your order to see live status.
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
