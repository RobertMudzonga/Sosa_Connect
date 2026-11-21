import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Home, Search, AlertCircle, ShoppingCart, User } from 'lucide-react-native';
import { theme, brand } from '@/src/theme/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/src/store/cart-store';
import { useMarketCartStore } from '@/src/store/market-cart-store';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const activeTheme = theme[colorScheme];
  const foodCount = useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
  const marketCount = useMarketCartStore((state) => state.lines.reduce((sum, l) => sum + l.quantity, 0));
  const cartCount = foodCount + marketCount;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.blue,
        tabBarInactiveTintColor: activeTheme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: activeTheme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
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
          tabBarActiveTintColor: '#DC2626',
          tabBarInactiveTintColor: '#DC2626',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.sos, { backgroundColor: focused ? '#DC2626' : '#FFFFFF' }]}>
              <AlertCircle color={focused ? '#FFFFFF' : '#DC2626'} size={20} />
            </View>
          ),
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

const styles = StyleSheet.create({
  sos: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
