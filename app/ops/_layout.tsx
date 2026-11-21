import { Stack } from 'expo-router';
import React from 'react';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';

/** Operations and admin. The API enforces roles; screens only show what the role can use. */
export default function OpsLayout() {
  const t = useMarketTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.background },
        headerTintColor: t.accent,
        headerTitleStyle: { fontWeight: 'bold', color: t.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Operations' }} />
      <Stack.Screen name="drivers" options={{ title: 'Drivers' }} />
      <Stack.Screen name="fees" options={{ title: 'Distance fees' }} />
      <Stack.Screen name="dispatch" options={{ title: 'Live dispatch' }} />
      <Stack.Screen name="disputes" options={{ title: 'Disputes' }} />
      <Stack.Screen name="locations" options={{ title: 'Towns & zones' }} />
      <Stack.Screen name="location" options={{ title: 'Town' }} />
      <Stack.Screen name="zone-pricing" options={{ title: 'Zone prices' }} />
      <Stack.Screen name="pickup-points" options={{ title: 'Pickup points' }} />
      <Stack.Screen name="store-kyc" options={{ title: 'Store review' }} />
      <Stack.Screen name="hub" options={{ title: 'Pick, pack & dispatch' }} />
      <Stack.Screen name="receiving" options={{ title: 'Receive stock' }} />
      <Stack.Screen name="driver" options={{ title: 'My deliveries' }} />
      <Stack.Screen name="pickup" options={{ title: 'Pickup counter' }} />
      <Stack.Screen name="cod" options={{ title: 'Cash-up' }} />
      <Stack.Screen name="returns" options={{ title: 'Returns' }} />
      <Stack.Screen name="admin" options={{ title: 'Marketplace admin' }} />
      <Stack.Screen name="sellers" options={{ title: 'Store verification' }} />
      <Stack.Screen name="payouts" options={{ title: 'Seller payouts' }} />
      <Stack.Screen name="settings" options={{ title: 'Rates & rules' }} />
      <Stack.Screen name="staff" options={{ title: 'Staff' }} />
      <Stack.Screen name="catalog" options={{ title: 'Catalog' }} />
      <Stack.Screen name="product" options={{ title: 'Product' }} />
      <Stack.Screen name="requests" options={{ title: 'Product requests' }} />
      <Stack.Screen name="request" options={{ title: 'Review request' }} />
    </Stack>
  );
}
