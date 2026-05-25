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
  timeout: 10000,
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // TODO: Implement refresh token logic here if needed
      // const { refreshToken } = useAuthStore.getState();
      // const res = await api.post('/auth/refresh', { refreshToken });
      // useAuthStore.getState().setAuth(res.data.accessToken, res.data.refreshToken, useAuthStore.getState().user!);
      // return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
