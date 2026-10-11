import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from '@/src/theme/colors';
import { useAuthStore } from '@/src/store/auth-store';

export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const role = useAuthStore((s) => s.user?.role);

  // The API must enforce this too; this just keeps non-admins out of the screens
  if (role !== 'ADMIN') return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: activeTheme.background,
        },
        headerTintColor: activeTheme.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="approvals"
        options={{
          title: 'Seller Approvals',
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'User Management',
        }}
      />
      <Stack.Screen
        name="inventory"
        options={{
          title: 'Global Inventory',
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'Orders & Refunds',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Fees & Commission',
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          title: 'SOS Alerts',
        }}
      />
    </Stack>
  );
}
