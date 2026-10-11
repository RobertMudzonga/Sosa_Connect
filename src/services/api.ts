import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/auth-store';

import { Platform } from 'react-native';

const getBaseUrl = () => {
  const extraApiUrl = Constants?.expoConfig?.extra?.apiUrl as string | undefined;
  if (extraApiUrl) {
    return extraApiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api/v1';
    return 'http://localhost:3000/api/v1';
  }

  return 'https://api.sosaconnect.zw/api/v1';
};

const BASE_URL = getBaseUrl();
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Only one refresh request runs at a time; concurrent 401s wait on the same promise.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken, user, setAuth } = useAuthStore.getState();
  if (!refreshToken || !user) throw new Error('No refresh token');
  // Use bare axios so this request doesn't go through the interceptors below
  const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
  const result = data.data;
  setAuth(result.accessToken, result.refreshToken ?? refreshToken, result.user ?? user);
  return result.accessToken as string;
};

const isAuthEndpoint = (url?: string) =>
  !!url && /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(url);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => { refreshPromise = null; });
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed: the session is over. AuthGuard redirects to login.
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  }
);
