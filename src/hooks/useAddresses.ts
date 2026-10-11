import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  lat?: number;
  lng?: number;
  instructions?: string;
  isDefault?: boolean;
}

export type AddressInput = Omit<Address, 'id'>;

export const useAddresses = (enabled = true) => {
  return useQuery({
    queryKey: ['addresses'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get('/addresses');
      return data.data as Address[];
    },
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddressInput) => {
      const { data } = await api.post('/addresses', dto);
      return data.data as Address;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/addresses/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
};

export const formatAddress = (a: Pick<Address, 'line1' | 'line2' | 'city'>) =>
  [a.line1, a.line2, a.city].filter(Boolean).join(', ');
