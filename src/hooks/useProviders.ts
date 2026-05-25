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
