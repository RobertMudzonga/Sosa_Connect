import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Address } from './useAddresses';

export type DeliveryStatus = 'AVAILABLE' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED';

export interface Delivery {
  id: string;
  orderId: string;
  orderReference: string;
  status: DeliveryStatus;
  pickup: { name: string; address: string; phone?: string; lat?: number; lng?: number };
  dropoff: Address & { contactName?: string; phone?: string };
  itemCount: number;
  /** Amount to collect from the customer for cash orders */
  cashToCollect?: number;
  fee: number;
  currency: string;
}

export const useAvailableDeliveries = () => {
  return useQuery({
    queryKey: ['deliveries', 'available'],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await api.get('/deliveries/available');
      return data.data as Delivery[];
    },
  });
};

export const useMyDeliveries = () => {
  return useQuery({
    queryKey: ['deliveries', 'mine'],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data } = await api.get('/deliveries/mine');
      return data.data as Delivery[];
    },
  });
};

export const useAcceptDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/deliveries/${id}/accept`);
      return data.data as Delivery;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliveries'] }),
  });
};

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, proofPhotoUrl }: { id: string; status: 'PICKED_UP' | 'DELIVERED'; proofPhotoUrl?: string }) => {
      const { data } = await api.patch(`/deliveries/${id}/status`, { status, proofPhotoUrl });
      return data.data as Delivery;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliveries'] }),
  });
};

export const sendDriverLocation = (id: string, lat: number, lng: number) =>
  api.post(`/deliveries/${id}/location`, { lat, lng });
