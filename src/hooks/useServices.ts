import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl?: string;
  provider?: {
    businessName: string;
    city: string;
    rating: number;
  };
}

export const useServices = (params?: { category?: string; search?: string; providerId?: string }) => {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      const { data } = await api.get('/services', { params });
      return data.data as Service[];
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/services', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};
