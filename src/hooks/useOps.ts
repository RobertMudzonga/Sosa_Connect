import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { InboundNotice, Payout, ProductRequest, ProductRequestStatus } from './useMerchant';

export type StaffRole = 'ADMIN' | 'WAREHOUSE' | 'DRIVER' | 'PICKUP_AGENT';

export interface StaffMe {
  id: string;
  role: StaffRole;
  name: string;
  hub: { id: string; code: string; name: string } | null;
  pickupPoint: { id: string; code: string; name: string } | null;
}

export interface OpsShipment {
  id: string;
  reference: string;
  status: string;
  sourceType: 'PLATFORM_FULFILLED' | 'SELLER_FULFILLED';
  tier: string;
  tierLabel: string;
  hub: { id: string; code: string; name: string } | null;
  driver: { id: string; name: string } | null;
  courierName: string | null;
  trackingNumber: string | null;
  deliveryAttempts: number;
  lastAttemptNote: string | null;
  deliveredAt: string | null;
  weightKg: number | null;
  cashToCollect: { amount: number; currency: 'USD' | 'ZWG' } | null;
  cashCollected: number | null;
  order: {
    id: string;
    reference: string;
    deliveryMode: 'DELIVERY' | 'PICKUP';
    address: Record<string, string | null>;
    city: string;
    pickupPoint: { id: string; code: string; name: string; address: string } | null;
    recipientName: string;
    recipientPhone: string;
  };
  items: { id: string; offerId: string; title: string; sku: string; quantity: number; bin: string | null }[];
}

export interface PickLine { offerId: string; title: string; sku: string; bin: string | null; quantity: number; parcels: string[] }
export interface Driver { id: string; name: string; phone: string | null; outForDelivery: number }

export interface CodItem {
  id: string;
  shipmentReference: string;
  collector: { id: string; name: string };
  currency: 'USD' | 'ZWG';
  expectedAmount: number;
  collectedAmount: number;
  short: number;
  status: 'COLLECTED' | 'VERIFIED' | 'DISCREPANCY';
  collectedAt: string;
  note: string | null;
}

export interface ReturnRequest {
  id: string;
  reference: string;
  status: 'APPROVED' | 'DROPPED_OFF' | 'RECEIVED' | 'REFUNDED' | 'REJECTED' | 'CANCELLED';
  reason: 'DEFECTIVE' | 'WRONG_ITEM' | 'DAMAGED_IN_TRANSIT' | 'NOT_AS_DESCRIBED';
  details: string | null;
  method: 'DROP_OFF' | 'COURIER_COLLECTION';
  pickupPoint: { id: string; name: string; address: string } | null;
  refundDestination: 'WALLET' | 'ORIGINAL';
  refundUsd: number | null;
  refundManual: boolean;
  inspectionNote: string | null;
  order: { id: string; reference: string };
  buyer: { name: string; phone: string | null };
  items: { id: string; orderItemId: string; title: string; image: string | null; quantity: number; unitPriceUsd: number; fulfilmentType: string; resellable: boolean }[];
  createdAt: string;
}

export const RETURN_REASON_LABEL: Record<ReturnRequest['reason'], string> = {
  DEFECTIVE: 'Defective',
  WRONG_ITEM: 'Wrong item sent',
  DAMAGED_IN_TRANSIT: 'Damaged in transit',
  NOT_AS_DESCRIBED: 'Not as described',
};

export interface ReturnEligibility {
  returnWindowDays: number;
  cashOrder: boolean;
  items: { orderItemId: string; title: string; image: string | null; quantity: number; unitPriceUsd: number; returnableQuantity: number; returnBy: string | null; reason: string | null }[];
  returns: ReturnRequest[];
}

export interface Analytics {
  days: number;
  totals: { orders: number; gmvUsd: number; billedUsd: number; averageOrderUsd: number; cancelledOrders: number; cancellationRate: number; returns: number; refundedUsd: number };
  revenue: { commissionAndFeesUsd: number; deliveryUsd: number; codFeesUsd: number; totalUsd: number };
  daily: { day: string; orders: number; gmvUsd: number }[];
  byPaymentMethod: { key: string; orders: number; gmvUsd: number }[];
  byCurrency: { key: string; orders: number; gmvUsd: number }[];
  byFulfilment: { key: string; units: number; gmvUsd: number }[];
  byCategory: { name: string; units: number; gmvUsd: number }[];
  topSellers: { name: string; firstParty: boolean; units: number; gmvUsd: number }[];
  codOutstanding: { currency: string; collections: number; amount: number }[];
}

export interface AdminSeller {
  id: string;
  businessName: string;
  kycTier: 'INFORMAL' | 'REGISTERED';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  taxNumber: string | null;
  nationalId?: string | null;
  phone: string | null;
  city: { name: string } | null;
  ownerEmail: string;
  slaScore: number;
  disputeRate: number;
  isFirstParty: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: 'WAREHOUSE' | 'DRIVER' | 'PICKUP_AGENT';
  hub: { id: string; code: string; name: string } | null;
  pickupPoint: { id: string; code: string; name: string } | null;
}

export type MarketSettings = Record<string, number | boolean>;

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get(url, { params })).data.data as T;
const post = async <T,>(url: string, body?: unknown) => (await api.post(url, body ?? {})).data.data as T;

export const useStaffMe = () => useQuery({ queryKey: ['ops', 'me'], retry: false, queryFn: () => get<StaffMe>('/ops/me') });
export const useHubQueue = (tab: string) => useQuery({ queryKey: ['ops', 'hub', tab], queryFn: () => get<OpsShipment[]>('/ops/hub/shipments', { tab }) });
export const usePickList = (enabled: boolean) => useQuery({ queryKey: ['ops', 'picklist'], enabled, queryFn: () => get<PickLine[]>('/ops/hub/picklist') });
export const useDrivers = () => useQuery({ queryKey: ['ops', 'drivers'], queryFn: () => get<Driver[]>('/ops/hub/drivers') });
export const useHubInbound = (status = 'SUBMITTED') => useQuery({ queryKey: ['ops', 'inbound', status], queryFn: () => get<InboundNotice[]>('/merchant/hub/inbound', { status }) });
export const useDriverShipments = () => useQuery({ queryKey: ['ops', 'driver'], refetchInterval: 30_000, queryFn: () => get<OpsShipment[]>('/ops/driver/shipments') });
export const usePickupShipments = () => useQuery({ queryKey: ['ops', 'pickup'], refetchInterval: 30_000, queryFn: () => get<OpsShipment[]>('/ops/pickup/shipments') });
export const useCod = (status: string) =>
  useQuery({ queryKey: ['ops', 'cod', status], queryFn: () => get<{ items: CodItem[]; collectors: { collector: { id: string; name: string }; count: number; totals: Record<string, number> }[] }>('/ops/cod', { status }) });
export const useOpsReturns = (status?: string) => useQuery({ queryKey: ['ops', 'returns', status ?? 'open'], queryFn: () => get<ReturnRequest[]>('/ops/returns', { status }) });
export const useAnalytics = (days: number) => useQuery({ queryKey: ['ops', 'analytics', days], queryFn: () => get<Analytics>('/ops/admin/analytics', { days }) });
export const useAdminSellers = (status: string) => useQuery({ queryKey: ['ops', 'sellers', status], queryFn: () => get<AdminSeller[]>('/sellers', { status, limit: 100 }) });
export const useAdminPayouts = (status: string) => useQuery({ queryKey: ['ops', 'payouts', status], queryFn: () => get<(Payout & { sellerName?: string; exchangeRate: number; destination: Record<string, string> })[]>('/merchant/admin/payouts', { status }) });
export const useStaffList = () => useQuery({ queryKey: ['ops', 'staff'], queryFn: () => get<StaffMember[]>('/ops/admin/staff') });
export const useMarketSettings = () => useQuery({ queryKey: ['ops', 'settings'], queryFn: () => get<MarketSettings>('/market/settings') });
export const useRateHistory = () =>
  useQuery({ queryKey: ['ops', 'rates'], queryFn: () => get<{ id: string; rate: number; effectiveFrom: string; note: string | null; setBy: string | null; status: string }[]>('/currency/rates', { limit: 10 }) });
export const useReturnEligibility = (orderId?: string, enabled = true) =>
  useQuery({ queryKey: ['returns', 'order', orderId], enabled: !!orderId && enabled, queryFn: () => get<ReturnEligibility>(`/returns/order/${orderId}`) });

// ── Catalog editor (admin) ────────────────────────────────

export interface AdminProductRow {
  id: string;
  sku: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  brand: string | null;
  category: string;
  image: string | null;
  offerCount: number;
  inStock: boolean;
  buyBoxPriceUsd: number | null;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  title: string;
  description?: string;
  brandId?: string | null;
  categoryId: string;
  specifications: Record<string, string>;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  weightKg?: number;
  images: { url: string; thumbUrl?: string; alt?: string }[];
}

export const useAdminProducts = (q: string, status?: string) =>
  useQuery({
    queryKey: ['ops', 'catalog', q, status ?? 'all'],
    queryFn: () => get<AdminProductRow[]>('/catalog/admin/products', { q: q || undefined, status, limit: 100 }),
  });
export const useBrands = () =>
  useQuery({ queryKey: ['catalog', 'brands'], staleTime: 5 * 60 * 1000, queryFn: () => get<{ id: string; name: string; slug: string }[]>('/catalog/brands') });

export type AdminProductRequest = ProductRequest & { seller: { id: string; businessName: string; kycStatus: string } };
export type ProductMatch = { id: string; slug: string; sku: string; title: string; status: string; image: string | null; barcodeMatch: boolean };

export const useProductRequests = (status?: ProductRequestStatus) =>
  useQuery({
    queryKey: ['ops', 'product-requests', status ?? 'all'],
    queryFn: async () => {
      const res = (await api.get('/catalog/admin/requests', { params: { status } })).data;
      return { data: res.data as AdminProductRequest[], counts: res.counts as Partial<Record<ProductRequestStatus, number>> };
    },
  });
export const useProductRequest = (id?: string) =>
  useQuery({
    queryKey: ['ops', 'product-request', id],
    enabled: !!id,
    queryFn: () => get<AdminProductRequest & { possibleMatches: ProductMatch[] }>(`/catalog/admin/requests/${id}`),
  });

export const catalogApi = {
  approveRequest: (id: string, body: ProductInput & { reviewNote?: string }) => post<AdminProductRequest>(`/catalog/admin/requests/${id}/approve`, body),
  linkRequest: (id: string, body: { productId: string; reviewNote?: string }) => post<AdminProductRequest>(`/catalog/admin/requests/${id}/link`, body),
  rejectRequest: (id: string, reviewNote: string) => post<AdminProductRequest>(`/catalog/admin/requests/${id}/reject`, { reviewNote }),
  create: (body: ProductInput) => post<{ id: string; slug: string }>('/catalog/products', body),
  update: (id: string, body: Partial<ProductInput>) => api.patch(`/catalog/products/${id}`, body).then((r) => r.data.data as { id: string; slug: string }),
  archive: (id: string) => api.delete(`/catalog/products/${id}`).then((r) => r.data.data),
  createBrand: (name: string) => post<{ id: string; name: string }>('/catalog/brands', { name }),
  createCategory: (body: { name: string; parentId?: string | null; commissionRate?: number }) => post<{ id: string; name: string }>('/catalog/categories', body),
};

/** Any ops action: runs the request and refreshes every ops screen */
export function useOpsAction<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops'] });
      qc.invalidateQueries({ queryKey: ['returns'] });
      qc.invalidateQueries({ queryKey: ['market'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
      qc.invalidateQueries({ queryKey: ['currency'] });
    },
  });
}

export const opsApi = {
  pack: (id: string) => post<OpsShipment>(`/ops/hub/shipments/${id}/pack`),
  dispatch: (id: string, body: { driverId?: string; courierName?: string; trackingNumber?: string }) => post<OpsShipment>(`/ops/hub/shipments/${id}/dispatch`, body),
  handover: (id: string, body: { pin: string; cashCollected?: number }) => post<OpsShipment>(`/ops/shipments/${id}/handover`, body),
  fail: (id: string, body: { reason: string; note?: string }) => post<OpsShipment>(`/ops/shipments/${id}/fail`, body),
  arrived: (id: string) => post<OpsShipment>(`/ops/pickup/shipments/${id}/arrived`),
  receiveInbound: (id: string, body: { items: { itemId: string; received: number; damaged: number; bin?: string }[]; notes?: string }) => post(`/merchant/hub/inbound/${id}/receive`, body),
  verifyCod: (body: { ids: string[]; counted: { USD?: number; ZWG?: number }; note?: string }) => post<{ status: string; note: string | null }>('/ops/cod/verify', body),
  returnDroppedOff: (id: string) => post(`/ops/returns/${id}/dropped-off`),
  returnReceived: (id: string) => post(`/ops/returns/${id}/received`),
  inspect: (id: string, body: { approve: boolean; note: string; sellerAtFault?: boolean; resellableItemIds?: string[] }) => post(`/ops/returns/${id}/inspect`, body),
  sellerKyc: (id: string, body: { status: 'APPROVED' | 'REJECTED' | 'SUSPENDED'; note?: string }) => api.patch(`/sellers/${id}/kyc`, body).then((r) => r.data.data),
  payoutAction: (id: string, action: 'approve' | 'paid' | 'reject', body?: Record<string, string>) => post(`/merchant/admin/payouts/${id}/${action}`, body),
  setRate: (body: { rate: number; effectiveFrom?: string; note?: string }) => post('/currency/rates', body),
  updateSettings: (body: MarketSettings) => api.patch('/market/settings', body).then((r) => r.data.data),
  updateCategory: (id: string, body: { commissionRate?: number; fulfilmentFeeUsd?: number; requiredVehicleClass?: 'BIKE' | 'CAR' | 'BAKKIE'; isReturnable?: boolean }) => api.patch(`/catalog/categories/${id}`, body).then((r) => r.data.data),
  saveStaff: (body: { email: string; fullName: string; role: string; hubId?: string; pickupPointId?: string; password?: string; phone?: string }) => post<StaffMember>('/ops/admin/staff', body),
  createReturn: (body: { orderId: string; items: { orderItemId: string; quantity: number }[]; reason: string; details?: string; method: string; pickupPointId?: string; refundDestination: string }) => post<ReturnRequest>('/returns', body),
  cancelReturn: (id: string) => post(`/returns/${id}/cancel`),
};
