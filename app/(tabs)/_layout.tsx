import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Home, Search, AlertCircle, ShoppingCart, User } from 'lucide-react-native';
import { theme } from '@/src/theme/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/src/store/cart-store';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const cartCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTheme.primary,
        tabBarInactiveTintColor: activeTheme.textSecondary,
        tabBarStyle: {
          backgroundColor: activeTheme.background,
          borderTopColor: activeTheme.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
          paddingTop: 8,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color, size }) => <AlertCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
