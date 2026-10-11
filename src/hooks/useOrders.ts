import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Address } from './useAddresses';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COLLECTED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED';

export type FulfilmentType = 'DELIVERY' | 'COLLECTION';
export type PaymentMethod = 'ECOCASH' | 'ONEMONEY' | 'CARD' | 'CASH';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItemOption {
  groupId: string;
  groupName?: string;
  optionId: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  serviceId: string;
  title: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  options: OrderItemOption[];
  notes?: string;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  fulfilment: FulfilmentType;
  provider: { id: string; businessName: string; phone?: string; address?: string };
  buyer?: { id: string; fullName: string; phone?: string };
  items: OrderItem[];
  currency: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  address?: Address | null;
  scheduledFor?: string | null;
  estimatedReadyAt?: string | null;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: { status: OrderStatus; at: string }[];
  driver?: { fullName: string; phone?: string; lat?: number; lng?: number } | null;
  review?: { rating: number; comment?: string } | null;
}

export interface CheckoutRequest {
  items: { serviceId: string; quantity: number; optionIds: string[]; notes?: string }[];
  fulfilment: FulfilmentType;
  addressId?: string;
  paymentMethod: PaymentMethod;
  /** Mobile money number for EcoCash / OneMoney */
  paymentPhone?: string;
  /** ISO time, or null for ASAP */
  scheduledFor?: string | null;
  promoCode?: string;
  notes?: string;
}

/** Server-calculated totals. The client never decides what the customer pays. */
export interface Quote {
  currency: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  total: number;
  vendors: { providerId: string; providerName: string; subtotal: number; deliveryFee: number }[];
  promoCode?: string | null;
  promoError?: string | null;
  /** Problems that block ordering: store closed, below minimum order, item sold out, outside delivery area */
  errors: string[];
}

export interface PlaceOrderResponse {
  orders: Order[];
  payment?: {
    id: string;
    status: PaymentStatus;
    /** Hosted payment page (card / Paynow web checkout) */
    redirectUrl?: string;
    /** e.g. "Approve the EcoCash prompt on your phone" */
    instructions?: string;
  };
}

export const useOrders = (params?: { as?: 'buyer' | 'seller'; status?: OrderStatus[] }, options?: { refetchInterval?: number }) => {
  return useQuery({
    queryKey: ['orders', params],
    refetchInterval: options?.refetchInterval,
    queryFn: async () => {
      const { data } = await api.get('/orders', {
        params: { as: params?.as, status: params?.status?.join(',') },
      });
      return data.data as Order[];
    },
  });
};

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

export const useOrder = (id?: string) => {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data.data as Order;
    },
    // Live status updates: poll fast while waiting on payment, slower while the order is in progress
    refetchInterval: (query) => {
      const order = query.state.data as Order | undefined;
      if (!order) return false;
      if (order.paymentStatus === 'PENDING' && order.paymentMethod !== 'CASH') return 5000;
      return ACTIVE_STATUSES.includes(order.status) ? 15000 : false;
    },
  });
};

export const useQuote = (request: CheckoutRequest | null) => {
  return useQuery({
    queryKey: ['quote', request],
    enabled: !!request && request.items.length > 0,
    queryFn: async () => {
      const { data } = await api.post('/orders/quote', request);
      return data.data as Quote;
    },
  });
};

export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      const { data } = await api.post('/orders', request);
      return data.data as PlaceOrderResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.post(`/orders/${id}/cancel`, { reason });
      return data.data as Order;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

/** Seller (and driver) status changes, e.g. PLACED → ACCEPTED */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: OrderStatus; reason?: string }) => {
      const { data } = await api.patch(`/orders/${id}/status`, { status, reason });
      return data.data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['providers', 'me', 'stats'] });
    },
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { orderId: string; rating: number; comment?: string }) => {
      const { data } = await api.post('/reviews', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
};

/** Retry payment on an order whose payment failed or was abandoned */
export const useRetryPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, paymentMethod, paymentPhone }: { orderId: string; paymentMethod: PaymentMethod; paymentPhone?: string }) => {
      const { data } = await api.post('/payments/initiate', { orderId, paymentMethod, paymentPhone });
      return data.data as NonNullable<PlaceOrderResponse['payment']>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};
