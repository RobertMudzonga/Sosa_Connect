import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { VehicleClass } from './useCatalog';

/** Store portal: the order queue worked by a store owner or branch staff */

export type StoreStage = 'NEW' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'RETURNING' | 'DELIVERED' | 'CANCELLED';
export type StoreTab = 'new' | 'preparing' | 'ready' | 'history';

export interface StoreOrder {
  id: string;
  reference: string;
  stage: StoreStage;
  status: string;
  branch: { id: string; code: string; name: string } | null;
  acceptBy: string | null;
  acceptedAt: string | null;
  readyBy: string | null;
  packedAt: string | null;
  overdue: boolean;
  reassigned: boolean;
  order: {
    id: string;
    reference: string;
    deliveryMode: 'DELIVERY' | 'PICKUP';
    recipientFirstName: string;
    area: string;
    pickupPointName: string | null;
    notes: string | null;
    confirmedAt: string | null;
  };
  distanceKm: number | null;
  vehicleClass: VehicleClass | null;
  items: { id: string; title: string; sku: string; sellerSku: string | null; quantity: number; unitPriceUsd: number; lineTotalUsd: number; sellerNetUsd: number }[];
  earningsUsd: number;
  deliveryJob: {
    reference: string;
    status: 'AWAITING_STORE' | 'OPEN' | 'CLAIMED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNING' | 'RETURNED_TO_STORE' | 'CANCELLED';
    pickupPin: string | null;
    driver: { name: string; vehicleClass: VehicleClass; vehicleReg: string | null } | null;
    claimedAt: string | null;
    pickedUpAt: string | null;
    failReason: string | null;
  } | null;
}

export interface StoreMe {
  storeName: string;
  kycStatus: string;
  isOwner: boolean;
  branches: { id: string; code: string; name: string; isActive: boolean; isPaused: boolean }[];
  counts: { new: number; preparing: number; ready: number };
}

export interface StoreStaff {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  active: boolean;
  branch: { id: string; code: string; name: string } | null;
  createdAt: string;
}

export interface StorePerformance {
  slaScore: number;
  last30Days: { accepted: number; ready: number; readyLate: number; timedOut: number; outOfStock: number; reassignedIn: number };
}

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get(url, { params })).data.data as T;

/** New orders must be accepted within minutes, so the queue refreshes itself */
const QUEUE_REFRESH_MS = 15_000;

export const useStoreMe = (enabled = true) =>
  useQuery({ queryKey: ['store', 'me'], enabled, retry: false, refetchInterval: QUEUE_REFRESH_MS, queryFn: () => get<StoreMe>('/store/me') });
export const useStoreOrders = (tab: StoreTab, branchId?: string) =>
  useQuery({ queryKey: ['store', 'orders', tab, branchId ?? null], refetchInterval: QUEUE_REFRESH_MS, queryFn: () => get<StoreOrder[]>('/store/orders', { tab, branchId }) });
export const useStorePerformance = (enabled = true) =>
  useQuery({ queryKey: ['store', 'performance'], enabled, queryFn: () => get<StorePerformance>('/store/performance') });
export const useStoreStaff = () => useQuery({ queryKey: ['store', 'staff'], queryFn: () => get<StoreStaff[]>('/store/staff') });

function useStoreMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store'] });
      qc.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
}

export const useStoreOrderAction = () =>
  useStoreMutation(({ id, action, note }: { id: string; action: 'accept' | 'ready' | 'out-of-stock' | 'received-back'; note?: string }) =>
    api.post(`/store/orders/${id}/${action}`, action === 'out-of-stock' ? { note } : {}).then((r) => r.data as { data: unknown; message: string }));
export const useCreateStaff = () =>
  useStoreMutation((dto: { fullName: string; email: string; phone?: string; password: string; branchId: string }) =>
    api.post('/store/staff', dto).then((r) => r.data.data as StoreStaff));
export const useUpdateStaff = () =>
  useStoreMutation(({ id, ...dto }: { id: string; branchId?: string; active?: boolean }) =>
    api.patch(`/store/staff/${id}`, dto).then((r) => r.data.data as StoreStaff));
