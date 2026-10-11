import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Order, OrderStatus } from './useOrders';

export interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  role: 'USER' | 'PROVIDER' | 'DRIVER' | 'ADMIN';
  status: string;
  profile?: { fullName?: string };
}

export interface AdminProvider {
  id: string;
  userId: string;
  businessName: string;
  city?: string;
  approvalStatus: string;
  category: string;
  user?: { email: string };
}

export interface CreateAdminUserDto {
  email: string;
  password: string;
  fullName: string;
  role: 'USER' | 'PROVIDER' | 'DRIVER';
  phone?: string;
}

export interface CreateAdminProviderDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  businessName: string;
  description?: string;
  category: string;
  address?: string;
  city?: string;
  website?: string;
  lat?: number;
  lng?: number;
}

export interface CreateAdminServiceDto {
  providerId: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  unit?: string;
  category: string;
  tags?: string[];
  imageUrl?: string;
}

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params: { page: 1, limit: 100 } });
      return res.data.data as AdminUser[];
    },
  });
};

export const useAdminProviders = () => {
  return useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: async () => {
      const res = await api.get('/admin/providers', { params: { page: 1, limit: 100 } });
      return res.data.data as AdminProvider[];
    },
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdminUserDto) => {
      const res = await api.post('/admin/users', dto);
      return res.data.data as AdminUser;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
};

export const useCreateAdminProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdminProviderDto) => {
      const res = await api.post('/admin/providers', dto);
      return res.data.data as { user: AdminUser; provider: AdminProvider };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
    },
  });
};

export const useCreateAdminService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdminServiceDto) => {
      const res = await api.post('/admin/services', dto);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
};

export interface PlatformSettings {
  /** Percentage of each order kept by the platform, e.g. 10 = 10% */
  commissionPercent: number;
  /** Fee charged to the buyer per order */
  serviceFee: number;
  taxPercent: number;
  currency: string;
}

export const useAdminOrders = (status?: OrderStatus) => {
  return useQuery({
    queryKey: ['admin', 'orders', status],
    queryFn: async () => {
      const res = await api.get('/admin/orders', { params: { status, page: 1, limit: 100 } });
      return res.data.data as Order[];
    },
  });
};

export const useRefundOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, reason }: { id: string; amount?: number; reason: string }) => {
      const res = await api.post(`/admin/orders/${id}/refund`, { amount, reason });
      return res.data.data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useAdminSettings = () => {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data.data as PlatformSettings;
    },
  });
};

export const useUpdateAdminSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<PlatformSettings>) => {
      const res = await api.patch('/admin/settings', dto);
      return res.data.data as PlatformSettings;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });
};
