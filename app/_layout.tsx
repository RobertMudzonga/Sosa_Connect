import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/auth-store';
import { Stack, useNavigationContainerRef, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '@/src/theme/colors';
import { usePushNotifications } from '@/src/services/notifications';
import { useFavouritesSync } from '@/src/store/favourites-store';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, _hydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  // The router throws if we navigate before the navigation container is ready,
  // so wait for its `ready` event before running any redirects.
  const navigationRef = useNavigationContainerRef();
  const [navigationReady, setNavigationReady] = useState(() => navigationRef.isReady());

  useEffect(() => {
    if (navigationReady) return;
    if (navigationRef.isReady()) {
      setNavigationReady(true);
      return;
    }
    return navigationRef.addListener('ready', () => setNavigationReady(true));
  }, [navigationRef, navigationReady]);

  useEffect(() => {
    // Wait for the root navigator to mount and persisted auth state to hydrate before redirecting
    if (!navigationReady || !_hydrated || (segments as string[]).length === 0) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authenticated = !!token && !!user;

    console.log('[Auth Guard]', {
      hydrated: _hydrated,
      authenticated,
      hasToken: !!token,
      hasUser: !!user,
      inAuthGroup,
      segments,
    });

    if (authenticated && inAuthGroup) {
      // Logged in but still on an auth screen → go to app
      console.log('[Auth Guard] Logged in → redirect to tabs');
      router.replace('/(tabs)');
      return;
    }

    if (!authenticated && !inAuthGroup) {
      // Not logged in and not on an auth screen → go to login
      console.log('[Auth Guard] Not logged in → redirect to login');
      router.replace('/(auth)/login');
    }
  }, [navigationReady, token, user, _hydrated, segments]);

  usePushNotifications();
  useFavouritesSync();

  // Always render the navigator so it mounts on the first render; cover it while auth hydrates
  return (
    <View style={{ flex: 1 }}>
      {children}
      {!_hydrated && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.dark.background,
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const activeTheme = theme[colorScheme ?? 'dark'];

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: activeTheme.background },
              headerTintColor: activeTheme.primary,
              headerTitleStyle: { fontWeight: 'bold', color: activeTheme.text },
              headerShadowVisible: false,
              headerBackTitle: 'Back',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="seller" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: '' }} />
            <Stack.Screen name="provider/[id]" options={{ title: '' }} />
            <Stack.Screen name="catalog/[slug]" options={{ title: '' }} />
            <Stack.Screen name="market/checkout" options={{ title: 'Checkout' }} />
            <Stack.Screen name="market/orders/index" options={{ title: 'Shop orders' }} />
            <Stack.Screen name="market/orders/[id]" options={{ title: 'Order' }} />
            <Stack.Screen name="merchant" options={{ headerShown: false }} />
            <Stack.Screen name="ops" options={{ headerShown: false }} />
            <Stack.Screen name="drive" options={{ headerShown: false }} />
            <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
            <Stack.Screen name="orders/index" options={{ title: 'My Orders' }} />
            <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
            <Stack.Screen name="addresses" options={{ title: 'Saved Addresses' }} />
            <Stack.Screen name="favourites" options={{ title: 'Favourites' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="security" options={{ title: 'Privacy & Security' }} />
            <Stack.Screen name="driver" options={{ title: 'Deliveries' }} />
            <Stack.Screen name="verify-phone" options={{ title: 'Verify Phone' }} />
            <Stack.Screen name="emergency-contacts" options={{ title: 'Emergency Contacts' }} />
          </Stack>
        </AuthGuard>
        <StatusBar style="dark" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
