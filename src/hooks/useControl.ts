import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { VehicleClass } from './useCatalog';

/** Admin control tower (/control/*): locations & zone pricing, pickup points, store KYC, dispatch, disputes */

export interface ZoneRow { id: string; code: string; name: string; sortOrder: number; suburbCount: number }
export interface SuburbRow { id: string; name: string; lat: number | null; lng: number | null; zoneId: string | null; isActive: boolean; branchCount: number }
export interface TownRow {
  id: string; name: string; slug: string; province: string; zone: 'METRO' | 'INTERCITY'; codEligible: boolean;
  lat: number | null; lng: number | null; sortOrder: number; isActive: boolean; pickupPointCount: number; branchCount: number;
  zones: ZoneRow[]; suburbs: SuburbRow[]; unzonedSuburbs: number;
}
export interface ZoneRule {
  originZoneId: string; destinationZoneId: string; vehicleClass: VehicleClass;
  customerFeeUsd: number; driverPayoutUsd: number; customerPerKmUsd: number; driverPerKmUsd: number; marginUsd?: number;
}
export interface ZoneMatrix { cityId: string; zones: { id: string; code: string; name: string }[]; rules: ZoneRule[] }

export type PickupType = 'PARTNER_SHOP' | 'MALL' | 'BUS_DEPOT' | 'COURIER_DEPOT';
export interface PickupPointRow {
  id: string; code: string; name: string; type: PickupType; city: { id: string; name: string }; suburb: { id: string | null; name: string } | null;
  address: string; landmark: string | null; lat: number | null; lng: number | null; phone: string | null; operatingHours: string | null;
  agentFeeUsd: number; maxDailyParcels: number | null; isActive: boolean; bookedToday: number; collectedThisMonth: number; agentFeesThisMonthUsd: number;
}

export interface StoreKyc {
  id: string; businessName: string; slug: string; kycTier: 'INFORMAL' | 'REGISTERED'; kycStatus: string; rejectionNote: string | null;
  owner: { name: string | null; email: string; phone: string | null; phoneVerified: boolean };
  nationalId: string | null; taxNumber: string | null; city: string | null;
  payout: { usd: Record<string, string> | null; zig: Record<string, string> | null };
  payoutHold: { at: string; reason: string | null } | null;
  slaScore: number; disputeRate: number;
  branches: { id: string; code: string; name: string; address: string; landmark: string | null; city: string; suburb: string | null; lat: number; lng: number; phone: string | null; isActive: boolean; mapUrl: string; locationVerifiedAt: string | null }[];
  checklist: { key: string; label: string; ok: boolean }[];
  readyToApprove: boolean;
}

export type DelayReason = 'STORE_NOT_ACCEPTED' | 'STORE_NOT_PACKED' | 'NO_DRIVER' | 'PICKUP_LATE' | 'DELIVERY_LATE' | 'RETURN_LATE';
export interface LateParcel {
  shipmentId: string; reference: string;
  order: { id: string; reference: string; paymentMethod: string; payoutHeld: boolean };
  buyer: { name: string | null; phone: string | null };
  store: { branchId: string; name: string; phone: string | null; sellerId: string } | null;
  driver: { id: string; name: string | null; phone: string | null; vehicleReg: string | null } | null;
  job: { id: string; reference: string; status: string; distanceKm: number; driverFeeUsd: number; parcelValueUsd: number } | null;
  shipmentStatus: string; items: string[]; reassignCount: number; reason: DelayReason; minutesLate: number;
  actions: ('REASSIGN' | 'CANCEL' | 'RELEASE_DRIVER' | 'CALL')[];
}
export interface DispatchBoard {
  thresholds: { noDriverMinutes: number; pickupMinutes: number; deliverySlackMinutes: number; returnMinutes: number };
  live: { atStore: number; waitingForDriver: number; goingToStore: number; onTheRoad: number; returning: number };
  late: LateParcel[];
}

export interface DisputeRow {
  id: string; reference: string; status: string; reason: string; details: string | null; method: string;
  refundUsd: number | null; refundPaidBy: 'STORE' | 'PLATFORM' | null; inspectionNote: string | null; fullValueUsd: number;
  order: { id: string; reference: string }; buyer: { name: string; phone: string | null };
  items: { id: string; title: string; quantity: number; unitPriceUsd: number; image: string | null }[];
  orderPayoutHold: { at: string; reason: string | null } | null;
  stores: { id: string; name: string; disputeRate: number; payoutsHeld: boolean }[];
  createdAt: string;
}

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get(url, { params })).data.data as T;
const post = async <T,>(url: string, body?: unknown) => (await api.post(url, body ?? {})).data.data as T;
const patch = async <T,>(url: string, body: unknown) => (await api.patch(url, body)).data.data as T;

// Keys sit under ['ops'] so useOpsAction refreshes them after any change
export const useTowns = () => useQuery({ queryKey: ['ops', 'control', 'towns'], queryFn: () => get<TownRow[]>('/control/cities') });
export const useZoneMatrix = (cityId?: string) =>
  useQuery({ queryKey: ['ops', 'control', 'matrix', cityId], enabled: !!cityId, queryFn: () => get<ZoneMatrix>(`/control/cities/${cityId}/zone-pricing`) });
export const usePickupAdmin = () => useQuery({ queryKey: ['ops', 'control', 'pickup'], queryFn: () => get<PickupPointRow[]>('/control/pickup-points') });
export const useStoreKyc = (id?: string) => useQuery({ queryKey: ['ops', 'control', 'kyc', id], enabled: !!id, queryFn: () => get<StoreKyc>(`/control/stores/${id}/kyc`) });
export const useDispatchBoard = () => useQuery({ queryKey: ['ops', 'control', 'dispatch'], refetchInterval: 30_000, queryFn: () => get<DispatchBoard>('/control/dispatch') });
export const useReassignCandidates = (shipmentId?: string) =>
  useQuery({ queryKey: ['ops', 'control', 'candidates', shipmentId], enabled: !!shipmentId, queryFn: () => get<{ id: string; name: string; isPaused: boolean; canFill: boolean }[]>(`/control/dispatch/${shipmentId}/candidates`) });
export const useDisputes = (status: string) => useQuery({ queryKey: ['ops', 'control', 'disputes', status], queryFn: () => get<DisputeRow[]>('/control/disputes', { status }) });
export const useSimilarProducts = (id?: string) =>
  useQuery({ queryKey: ['ops', 'control', 'similar', id], enabled: !!id, queryFn: () => get<{ id: string; slug: string; title: string; status: string; offerCount: number; similarity: number }[]>(`/control/products/${id}/similar`) });

export const controlApi = {
  createTown: (body: Partial<TownRow>) => post<TownRow>('/control/cities', body),
  updateTown: (id: string, body: Partial<TownRow>) => patch<TownRow>(`/control/cities/${id}`, body),
  createSuburb: (cityId: string, body: { name: string; lat?: number; lng?: number; zoneId?: string | null }) => post<TownRow>(`/control/cities/${cityId}/suburbs`, body),
  updateSuburb: (id: string, body: Partial<Pick<SuburbRow, 'name' | 'lat' | 'lng' | 'zoneId' | 'isActive'>>) => patch<TownRow>(`/control/suburbs/${id}`, body),
  createZone: (cityId: string, body: { code: string; name: string; sortOrder?: number }) => post<TownRow>(`/control/cities/${cityId}/zones`, body),
  deleteZone: (id: string) => api.delete(`/control/zones/${id}`).then((r) => r.data.data as TownRow),
  saveMatrix: (cityId: string, rules: ZoneRule[]) => api.put(`/control/cities/${cityId}/zone-pricing`, { rules }).then((r) => r.data.data as ZoneMatrix),
  savePickup: (id: string | null, body: Record<string, unknown>) =>
    (id ? patch<PickupPointRow>(`/control/pickup-points/${id}`, body) : post<PickupPointRow>('/control/pickup-points', body)),
  verifyPin: (branchId: string, verified: boolean) => post<StoreKyc>(`/control/branches/${branchId}/verify-location`, { verified }),
  holdStore: (sellerId: string, reason: string | null) => post(`/control/stores/${sellerId}/payout-hold`, { reason }),
  holdOrder: (orderId: string, reason: string | null) => post(`/control/orders/${orderId}/payout-hold`, { reason }),
  reassign: (shipmentId: string, body: { branchId?: string; note?: string }) => post(`/control/dispatch/${shipmentId}/reassign`, body),
  cancelParcel: (shipmentId: string, reason: string) => post<{ refundUsd: number }>(`/control/dispatch/${shipmentId}/cancel`, { reason }),
  releaseDriver: (shipmentId: string, reason: string) => post(`/control/dispatch/${shipmentId}/release-driver`, { reason }),
  resolveDispute: (id: string, body: { outcome: 'REFUND' | 'REJECT'; payer?: 'STORE' | 'PLATFORM'; amountUsd?: number; restock?: boolean; note: string }) =>
    post<DisputeRow>(`/control/disputes/${id}/resolve`, body),
  mergeProduct: (id: string, intoProductId: string) => post<{ intoSlug: string; offersMoved: number; offersCombined: number }>(`/catalog/admin/products/${id}/merge`, { intoProductId }),
  setDriverCap: (driverId: string, maxParcelValueUsd: number | null) => post(`/drivers/admin/${driverId}/parcel-cap`, { maxParcelValueUsd }),
};
