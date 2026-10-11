import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

/** e.g. "Size" (pick 1, required) or "Extras" (pick up to 3) for food items */
export interface ServiceOptionGroup {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: ServiceOption[];
}

export interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  imageUrl?: string;
  unit?: string;
  /** null/undefined = not stock-tracked (e.g. made-to-order food) */
  stock?: number | null;
  isAvailable?: boolean;
  /** Menu section on the store page, e.g. "Mains", "Drinks" */
  section?: string;
  optionGroups?: ServiceOptionGroup[];
  provider?: {
    id?: string;
    businessName: string;
    city: string;
    rating: number;
    isVerified?: boolean;
    isOpen?: boolean;
  };
}

/** Groups without an id are created; groups/options omitted on update are removed */
export interface ServiceOptionGroupInput {
  id?: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: { id?: string; name: string; price: number }[];
}

export interface ServiceInput {
  title: string;
  description?: string;
  price: number;
  currency?: string;
  unit?: string;
  category: string;
  section?: string;
  stock?: number | null;
  isAvailable?: boolean;
  imageUrl?: string;
  optionGroups?: ServiceOptionGroupInput[];
}

export const useServices = (
  params?: { category?: string; search?: string; providerId?: string },
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['services', params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const { data } = await api.get('/services', { params: { limit: 100, ...params } });
      return data.data as Service[];
    },
  });
};

export const useService = (id?: string) => {
  return useQuery({
    queryKey: ['services', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/services/${id}`);
      return data.data as Service;
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: ServiceInput) => {
      const { data } = await api.post('/services', dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<ServiceInput> & { id: string }) => {
      const { data } = await api.patch(`/services/${id}`, dto);
      return data.data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};
