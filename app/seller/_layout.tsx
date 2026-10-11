import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from '@/src/theme/colors';
import { useAuthStore } from '@/src/store/auth-store';

export default function SellerLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const role = useAuthStore((s) => s.user?.role);

  // Store management is for sellers (and admins helping them) only
  if (role !== 'PROVIDER' && role !== 'ADMIN') return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: activeTheme.background },
        headerTintColor: activeTheme.primary,
        headerTitleStyle: { fontWeight: 'bold', color: activeTheme.text },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="orders" options={{ title: 'Incoming Orders' }} />
      <Stack.Screen name="settings" options={{ title: 'Store Settings' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
    </Stack>
  );
}
