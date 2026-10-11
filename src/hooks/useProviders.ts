import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Provider {
  id: string;
  businessName: string;
  description: string;
  category: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  logoUrl?: string;
  approvalStatus: string;
  phone?: string;
  address?: string;
  /** Store settings used by checkout and the store page */
  isOpen?: boolean;
  openingHours?: string;
  deliveryFee?: number;
  minOrder?: number;
  deliveryRadiusKm?: number;
  estimatedPrepMinutes?: number;
  offersDelivery?: boolean;
  offersCollection?: boolean;
}

export type ProviderSettings = Partial<Pick<Provider,
  'description' | 'phone' | 'address' | 'isOpen' | 'openingHours' | 'deliveryFee' | 'minOrder' |
  'deliveryRadiusKm' | 'estimatedPrepMinutes' | 'offersDelivery' | 'offersCollection'>>;

export interface ProviderStats {
  ordersToday: number;
  revenueToday: number;
  revenueMonth: number;
  pendingOrders: number;
  currency: string;
}

export const useProviders = (params?: { category?: string; search?: string }) => {
  return useQuery({
    queryKey: ['providers', params],
    queryFn: async () => {
      const { data } = await api.get('/providers', { params });
      return data.data as Provider[];
    },
  });
};

export const useProvider = (id?: string) => {
  return useQuery({
    queryKey: ['providers', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/providers/${id}`);
      return data.data as Provider;
    },
  });
};

/** The signed-in seller's own store. Resolves to null if the user has no store. */
export const useMyProvider = (enabled = true) => {
  return useQuery({
    queryKey: ['providers', 'me'],
    enabled,
    queryFn: async () => {
      try {
        const { data } = await api.get('/providers/me');
        return data.data as Provider;
      } catch (error: any) {
        if (error?.response?.status === 404 || error?.response?.status === 403) return null;
        throw error;
      }
    },
  });
};

export const useUpdateMyProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ProviderSettings) => {
      const { data } = await api.patch('/providers/me', dto);
      return data.data as Provider;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
};

export const useMyProviderStats = (enabled = true) => {
  return useQuery({
    queryKey: ['providers', 'me', 'stats'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get('/providers/me/stats');
      return data.data as ProviderStats;
    },
  });
};

export const usePendingProviders = () => {
  return useQuery({
    queryKey: ['providers', 'pending'],
    queryFn: async () => {
      const { data } = await api.get('/providers', { params: { approvalStatus: 'PENDING' } });
      return data.data as Provider[];
    },
  });
};

export const useApproveProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }) => {
      const { data } = await api.patch(`/providers/${id}/approval`, { status, rejectionNote: note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
};
