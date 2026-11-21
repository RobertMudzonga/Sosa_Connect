import { Stack } from 'expo-router';
import React from 'react';
import { useMarketTheme } from '@/src/components/marketplace/useMarketTheme';

/** Gig driver app: drive with Kuwana */
export default function DriveLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Drive with Kuwana' }} />
      <Stack.Screen name="apply" options={{ title: 'Become a driver' }} />
      <Stack.Screen name="wallet" options={{ title: 'Float & earnings' }} />
      <Stack.Screen name="job/[id]" options={{ title: 'Delivery' }} />
    </Stack>
  );
}
