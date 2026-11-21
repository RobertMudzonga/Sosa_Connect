import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Money, ExchangeRate, FulfilmentMethod, VehicleClass } from './useCatalog';
import type { LocationParams } from '../store/market-store';

export type PaymentMethod = 'ECOCASH' | 'ONEMONEY' | 'INNBUCKS' | 'ZIMSWITCH' | 'CARD' | 'WALLET' | 'CASH';
export type PayCurrency = 'USD' | 'ZWG';
/** A drop-off typed at checkout for this order only (e.g. a diaspora gift to family) */
export interface InlineAddress {
  cityId: string;
  suburbId?: string;
  line1: string;
  landmark: string;
  lat?: number;
  lng?: number;
  instructions?: string;
}

export type Fulfilment =
  | { mode: 'DELIVERY'; addressId: string }
  | { mode: 'DELIVERY'; address: InlineAddress }
  | { mode: 'PICKUP'; pickupPointId: string };

export type DepositMethod = 'ECOCASH' | 'INNBUCKS';

export interface Recipient {
  name: string;
  phone: string;
  idNumber?: string;
}

export interface QuoteBody {
  items: { offerId: string; quantity: number }[];
  fulfilment?: Fulfilment;
  speed?: 'STANDARD' | 'EXPRESS';
  paymentCurrency?: PayCurrency;
  paymentMethod?: PaymentMethod;
  recipient?: Recipient;
}

export interface LineIssue {
  offerId: string;
  type: 'UNAVAILABLE' | 'INSUFFICIENT_STOCK' | 'UNDELIVERABLE';
  message: string;
  availableQty: number;
}

export interface Quote {
  lines: {
    offerId: string;
    productId: string;
    slug: string;
    title: string;
    image: string | null;
    sellerName: string;
    isFirstParty: boolean;
    fulfilmentType: FulfilmentMethod;
    quantity: number;
    requestedQuantity: number;
    availableQty: number;
    unitPrice: Money;
    lineTotal: Money;
  }[];
  issues: LineIssue[];
  shipments: {
    key: string;
    label: string;
    sourceType: FulfilmentMethod;
    tier: string | null;
    tierLabel: string | null;
    fee: Money | null;
    baseFee: Money | null;
    feeWaived: boolean;
    etaMinDays: number | null;
    etaMaxDays: number | null;
    /** Store runs */
    etaMinutes: number | null;
    opensAt: string | null;
    storeBranchId: string | null;
    distanceKm: number | null;
    vehicleClass: VehicleClass | null;
    undeliverable: string | null;
    items: { offerId: string; title: string; quantity: number }[];
  }[];
  destination: { id: string; name: string; zone: 'METRO' | 'INTERCITY'; codEligible: boolean } | null;
  totals: {
    itemsSubtotal: Money; delivery: Money; sellerShipping: Money; codFee: Money; total: Money; deliveryPriced: boolean;
    /** Cash on delivery: paid upfront now, and in cash at the door */
    codDeposit: Money | null;
    cashOnDelivery: Money | null;
  };
  amountDue: { amount: number; currency: PayCurrency } | null;
  freeDelivery: { threshold: Money; qualifies: boolean; remaining: Money };
  express: { available: boolean; reason: string | null };
  cod: { eligible: boolean; reasons: string[] };
  paymentMethods: { method: PaymentMethod; label: string; available: boolean; reason?: string }[];
  isGift: boolean;
  exchangeRate: ExchangeRate | null;
}

export type ShipmentStatus =
  | 'PENDING' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_COLLECTION' | 'DELIVERED' | 'COLLECTED' | 'CANCELLED' | 'RETURNED';

export interface MarketOrder {
  id: string;
  reference: string;
  status: 'PENDING_PAYMENT' | 'AWAITING_COD_OTP' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'COD_PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: PaymentMethod;
  paymentCurrency: PayCurrency;
  lockedExchangeRate: number;
  deliveryMode: 'DELIVERY' | 'PICKUP';
  deliverySpeed: 'STANDARD' | 'EXPRESS';
  deliveryAddress: Record<string, string | number | null>;
  destinationCity: { id: string; name: string; slug: string };
  pickupPoint: { id: string; code: string; name: string; address: string; operatingHours: string | null } | null;
  recipient: { name: string; phone: string; isGift: boolean };
  totals: {
    itemsSubtotal: Money; delivery: Money; sellerShipping: Money; codFee: Money; discount: Money; total: Money;
    codDeposit: Money | null;
    cashOnDelivery: Money | null;
  };
  depositPaidAt: string | null;
  amountDue: { amount: number; currency: PayCurrency };
  freeDeliveryApplied: boolean;
  itemCount: number;
  shipments: {
    id: string;
    reference: string;
    status: ShipmentStatus;
    tier: string;
    tierLabel: string;
    source: string;
    sourceType: FulfilmentMethod;
    fee: Money;
    etaMinDays: number;
    etaMaxDays: number;
    estimatedFrom: string;
    estimatedTo: string;
    /** Store runs */
    distanceKm: number | null;
    vehicleClass: VehicleClass | null;
    etaMinutes: number | null;
    estimatedAt: string | null;
    deliveryJob: { status: string; reference: string } | null;
    items: { id: string; productId: string; title: string; image: string | null; quantity: number; unitPrice: Money; lineTotal: Money; sellerName: string }[];
  }[];
  payment: { id: string; status: string; method: PaymentMethod; amount: number; currency: string; instructions: string | null; redirectUrl: string | null } | null;
  codOtp: { sentAt: string | null; resendAvailableAt: string | null } | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface PlaceOrderResult {
  order: MarketOrder;
  payment: { id?: string; status: 'PAID' | 'PENDING' | 'FAILED'; redirectUrl?: string; instructions?: string; message?: string } | null;
}

export interface PickupPoint {
  id: string;
  code: string;
  name: string;
  type: 'PARTNER_SHOP' | 'MALL' | 'BUS_DEPOT' | 'COURIER_DEPOT';
  suburb: string | null;
  address: string;
  landmark: string | null;
  operatingHours: string | null;
  city: { id: string; name: string; slug: string };
  /** From the buyer's location, when given */
  distanceKm: number | null;
  /** At its daily parcel limit; checkout refuses it until tomorrow */
  isFull?: boolean;
}

export const useMarketQuote = (body: QuoteBody | null) =>
  useQuery({
    queryKey: ['market', 'quote', body],
    enabled: !!body && body.items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await api.post('/market/checkout/quote', body);
      return data.data as Quote;
    },
  });

/** Pickup points in a town, nearest first when the buyer's suburb or GPS pin is known */
export const usePickupPoints = (location?: LocationParams) =>
  useQuery({
    queryKey: ['logistics', 'pickup-points', location ?? null],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get('/logistics/pickup-points', { params: location });
      return data.data as PickupPoint[];
    },
  });

export const useWallet = (enabled = true) =>
  useQuery({
    queryKey: ['wallet'],
    enabled,
    queryFn: async () => {
      const { data } = await api.get('/wallet');
      return data.data as { balance: Money; history: { id: string; type: string; amount: Money; memo: string | null; createdAt: string }[] };
    },
  });

export const usePlaceMarketOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: QuoteBody & { fulfilment: Fulfilment; paymentCurrency: PayCurrency; paymentMethod: PaymentMethod; paymentPhone?: string; depositMethod?: DepositMethod; notes?: string; expectedTotalUsd: number }) => {
      const { data } = await api.post('/market/orders', body);
      return data.data as PlaceOrderResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'orders'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
};

/** Polls while the order waits on a payment so the screen updates when it's approved */
export const useMarketOrder = (id?: string) =>
  useQuery({
    queryKey: ['market', 'orders', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/market/orders/${id}`);
      return data.data as MarketOrder;
    },
    refetchInterval: (q) => (q.state.data?.status === 'PENDING_PAYMENT' || q.state.data?.status === 'AWAITING_DEPOSIT' ? 4000 : false),
  });

export const useMarketOrders = () =>
  useQuery({
    queryKey: ['market', 'orders', 'list'],
    queryFn: async () => {
      const { data } = await api.get('/market/orders', { params: { limit: 50 } });
      return data.data as MarketOrder[];
    },
  });

function useOrderAction<TVars>(path: (vars: TVars) => string, body: (vars: TVars) => unknown) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const { data } = await api.post(path(vars), body(vars));
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market', 'orders'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export const useVerifyCod = () =>
  useOrderAction<{ id: string; code: string }>((v) => `/market/orders/${v.id}/cod/verify`, (v) => ({ code: v.code }));
export const useResendCod = () =>
  useOrderAction<{ id: string }>((v) => `/market/orders/${v.id}/cod/resend`, () => ({}));
export const usePayMarketOrder = () =>
  useOrderAction<{ id: string; paymentMethod: Exclude<PaymentMethod, 'CASH'>; paymentPhone?: string }>(
    (v) => `/market/orders/${v.id}/pay`,
    (v) => ({ paymentMethod: v.paymentMethod, paymentPhone: v.paymentPhone }),
  );
export const useCancelMarketOrder = () =>
  useOrderAction<{ id: string; reason?: string }>((v) => `/market/orders/${v.id}/cancel`, (v) => ({ reason: v.reason }));
