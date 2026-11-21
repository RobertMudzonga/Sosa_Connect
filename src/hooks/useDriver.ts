import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { VehicleClass } from './useCatalog';

/** Gig driver app: onboarding, online status, float wallet, job feed and handovers */

export type DriverKyc = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface DriverProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  nationalId: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  vehicleClass: VehicleClass;
  vehicleReg: string | null;
  vehicleDescription: string | null;
  city: { id: string; name: string } | null;
  documents: { idDocUrl: string | null; licenseDocUrl: string | null; selfieUrl: string | null };
  kycStatus: DriverKyc;
  rejectionNote: string | null;
  maxParcelValueUsd: number | null;
  isOnline: boolean;
  location: { lat: number; lng: number; updatedAt: string } | null;
  ratingAvg: number;
  completedJobs: number;
  wallet: { availableFloatUsd: number; lockedFloatUsd: number; withdrawableEarningsUsd: number };
  createdAt: string;
}

export type JobStatus = 'AWAITING_STORE' | 'OPEN' | 'CLAIMED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNING' | 'RETURNED_TO_STORE' | 'CANCELLED';

export interface DriverJob {
  id: string;
  reference: string;
  status: JobStatus;
  vehicleRequired: VehicleClass;
  earningsUsd: number;
  collateralUsd: number;
  tripKm: number;
  kmToStore: number | null;
  canClaim: boolean | null;
  floatShortUsd: number | null;
  store: { name: string; code: string; address: string; landmark: string | null; lat: number; lng: number; phone: string | null; suburb: string | null };
  dropoff: {
    type: 'ADDRESS' | 'PICKUP_POINT';
    area: string;
    name?: string | null;
    address?: string | null;
    landmark?: string | null;
    instructions?: string | null;
    lat?: number | null;
    lng?: number | null;
    recipientName?: string;
    recipientPhone?: string;
  };
  parcel: { reference: string; items: string[]; notes: string | null };
  cashOnDelivery: { amountUsd: number; collect: { amount: number; currency: 'USD' | 'ZWG' } | null } | null;
  claimedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failReason: string | null;
}

export interface DriverWallet {
  availableFloatUsd: number;
  lockedFloatUsd: number;
  withdrawableEarningsUsd: number;
  entries: { id: string; type: string; availableDeltaUsd: number; lockedDeltaUsd: number; earningsDeltaUsd: number; availableAfterUsd: number; jobReference: string | null; memo: string | null; createdAt: string }[];
  withdrawals: { id: string; bucket: 'FLOAT' | 'EARNINGS'; amountUsd: number; method: string; status: 'REQUESTED' | 'PAID' | 'REJECTED'; externalRef: string | null; note: string | null; createdAt: string }[];
}

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get(url, { params })).data.data as T;

export const useDriverMe = () => useQuery({ queryKey: ['drive', 'me'], queryFn: () => get<DriverProfile | null>('/drivers/me') });
export const useDriverWallet = (enabled = true) => useQuery({ queryKey: ['drive', 'wallet'], enabled, queryFn: () => get<DriverWallet>('/drivers/me/wallet') });
export const useAvailableJobs = (enabled: boolean) =>
  useQuery({ queryKey: ['drive', 'jobs', 'available'], enabled, retry: false, refetchInterval: 20_000, queryFn: () => get<DriverJob[]>('/drivers/jobs/available') });
export const useMyJobs = (enabled = true) =>
  useQuery({ queryKey: ['drive', 'jobs', 'mine'], enabled, refetchInterval: 30_000, queryFn: () => get<{ active: DriverJob[]; recent: DriverJob[] }>('/drivers/jobs/mine') });
export const useDriverJob = (id?: string) =>
  useQuery({ queryKey: ['drive', 'jobs', id], enabled: !!id, refetchInterval: 20_000, queryFn: () => get<DriverJob>(`/drivers/jobs/${id}`) });

function useDriveMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['drive'] }) });
}

export interface DriverApplication {
  nationalId: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleClass: VehicleClass;
  vehicleReg?: string;
  vehicleDescription?: string;
  cityId: string;
  idDocUrl?: string;
  licenseDocUrl?: string;
  selfieUrl?: string;
}

export const useApplyToDrive = () => useDriveMutation((dto: DriverApplication) => api.post('/drivers/apply', dto).then((r) => r.data.data as DriverProfile));
export const useDriverStatus = () =>
  useDriveMutation((dto: { isOnline?: boolean; lat?: number; lng?: number }) => api.post('/drivers/me/status', dto).then((r) => r.data.data as DriverProfile));
export const useFloatDeposit = () =>
  useDriveMutation((dto: { amountUsd: number; method: 'ECOCASH' | 'INNBUCKS' | 'ONEMONEY'; phone: string }) =>
    api.post('/drivers/me/wallet/deposit', dto).then((r) => r.data.data as { id: string; status: 'PAID' | 'PENDING'; instructions?: string }));
export const useDriverWithdraw = () =>
  useDriveMutation((dto: { bucket: 'FLOAT' | 'EARNINGS'; amountUsd: number; method: 'ECOCASH' | 'INNBUCKS'; phone: string }) =>
    api.post('/drivers/me/wallet/withdraw', dto).then((r) => r.data.data));
export const useJobAction = () =>
  useDriveMutation(({ id, action, body }: { id: string; action: 'claim' | 'release' | 'pickup' | 'deliver' | 'fail'; body?: Record<string, unknown> }) =>
    api.post(`/drivers/jobs/${id}/${action}`, body ?? {}).then((r) => r.data.data as DriverJob));

// ── Admin ─────────────────────────────────────────────────

export interface DriverWithdrawalRow {
  id: string; driverId: string; driverName: string; bucket: 'FLOAT' | 'EARNINGS'; amountUsd: number; method: string;
  destination: { phone?: string }; status: string; externalRef: string | null; note: string | null; createdAt: string;
}

export const useAdminDrivers = (status: DriverKyc) => useQuery({ queryKey: ['drive', 'admin', status], queryFn: () => get<DriverProfile[]>('/drivers/admin', { status }) });
export const useAdminDriverWithdrawals = () => useQuery({ queryKey: ['drive', 'admin', 'withdrawals'], queryFn: () => get<DriverWithdrawalRow[]>('/drivers/admin/withdrawals/list') });
export const useAdminDriverAction = () =>
  useDriveMutation(({ path, body }: { path: string; body?: Record<string, unknown> }) => api.post(`/drivers/admin/${path}`, body ?? {}).then((r) => r.data.data));
