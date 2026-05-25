import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/auth-store';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, _hydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for persisted auth state to finish hydrating before redirecting
    if (!_hydrated || segments.length === 0) return;

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
  }, [token, user, _hydrated, segments]);

  if (!_hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGuard>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </AuthGuard>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
