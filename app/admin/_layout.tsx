import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { theme } from '@/src/theme/colors';

export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];

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
    </Stack>
  );
}
