import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface AdminUser {
  id: string;
  email: string;
  phone?: string;
  role: 'USER' | 'PROVIDER' | 'ADMIN';
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
  role: 'USER' | 'PROVIDER';
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
  return useQuery<AdminUser[]>(['admin', 'users'], async () => {
    const res = await api.get('/admin/users', { params: { page: 1, limit: 100 } });
    return res.data.data as AdminUser[];
  });
};

export const useAdminProviders = () => {
  return useQuery<AdminProvider[]>(['admin', 'providers'], async () => {
    const res = await api.get('/admin/providers', { params: { page: 1, limit: 100 } });
    return res.data.data as AdminProvider[];
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdminUserDto) => {
      const res = await api.post('/admin/users', dto);
      return res.data.data as AdminUser;
    },
    onSuccess: () => queryClient.invalidateQueries(['admin', 'users']),
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
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.invalidateQueries(['admin', 'providers']);
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
    onSuccess: () => queryClient.invalidateQueries(['services']),
  });
};
