import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { api } from './api';
import { useAuthStore } from '../store/auth-store';
import { useAppStore } from '../store/app-store';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let registeredToken: string | null = null;

const getPushToken = async (): Promise<string | null> => {
  // Push only works on physical devices, and not on web
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[Push] No EAS projectId configured; skipping push registration');
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
};

export const registerForPush = async () => {
  try {
    const token = await getPushToken();
    if (!token || token === registeredToken) return;
    await api.post('/devices', { token, platform: Platform.OS });
    registeredToken = token;
  } catch (error) {
    console.warn('[Push] Registration failed', error);
  }
};

/** Call before clearing auth so the server stops sending to this device */
export const unregisterFromPush = async () => {
  if (!registeredToken) return;
  try {
    await api.delete(`/devices/${encodeURIComponent(registeredToken)}`);
  } catch {
    // Not fatal: the server prunes dead tokens when sends fail
  } finally {
    registeredToken = null;
  }
};

/**
 * Registers the device while signed in with notifications enabled, and routes
 * notification taps. Expected payload: { type: 'ORDER_UPDATE' | 'NEW_ORDER' | 'NEW_DELIVERY' | 'EMERGENCY_ALERT', orderId? }
 */
export const usePushNotifications = () => {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const enabled = useAppStore((s) => s.notificationsEnabled);

  useEffect(() => {
    if (!token) return;
    if (enabled) registerForPush();
    else unregisterFromPush();
  }, [token, enabled]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; orderId?: string };
      if (data?.type === 'EMERGENCY_ALERT') router.push('/admin/alerts');
      else if (data?.type === 'NEW_ORDER') router.push('/seller/orders');
      else if (data?.type === 'NEW_DELIVERY') router.push('/driver');
      else if (data?.orderId) router.push({ pathname: '/orders/[id]', params: { id: data.orderId } });
    });
    return () => subscription.remove();
  }, [router]);
};
