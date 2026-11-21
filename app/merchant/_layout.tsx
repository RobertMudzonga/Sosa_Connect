import { Stack } from 'expo-router';
import React from 'react';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';

/** Marketplace seller portal. Access is checked by the API (owning a seller profile), not by role. */
export default function MerchantLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Seller portal' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Sell on Kuwana' }} />
      <Stack.Screen name="offers" options={{ title: 'My offers' }} />
      <Stack.Screen name="new-offer" options={{ title: 'Add a product' }} />
      <Stack.Screen name="request-product" options={{ title: 'Request a product' }} />
      <Stack.Screen name="requests" options={{ title: 'Product requests' }} />
      <Stack.Screen name="shipments" options={{ title: 'Orders to ship' }} />
      <Stack.Screen name="inbound" options={{ title: 'Send stock to a hub' }} />
      <Stack.Screen name="payouts" options={{ title: 'Earnings & payouts' }} />
      <Stack.Screen name="branches" options={{ title: 'Store branches' }} />
      <Stack.Screen name="branch" options={{ title: 'Branch' }} />
      <Stack.Screen name="orders" options={{ title: 'Orders' }} />
      <Stack.Screen name="staff" options={{ title: 'Branch staff' }} />
    </Stack>
  );
}
