import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Money, FulfilmentMethod } from './useCatalog';

export interface SellerProfile {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  isFirstParty: boolean;
  kycTier: 'INFORMAL' | 'REGISTERED';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  taxNumber: string | null;
  phone: string | null;
  city: { id: string; name: string } | null;
  plan: 'STARTER' | 'PRO';
  slaScore: number;
  leadTimeDays: number;
  usdPayoutDetails: Record<string, string> | null;
  zigPayoutDetails: Record<string, string> | null;
  rejectionNote: string | null;
}

export type OperatingHours = Partial<Record<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat', [string, string][]>>;

/** A physical store location that holds stock and packs orders */
export interface StoreBranch {
  id: string;
  code: string;
  name: string;
  city: { id: string; name: string; slug: string };
  suburb: { id: string; name: string } | null;
  address: string;
  landmark: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  operatingHours: OperatingHours;
  defaultPrepTimeMins: number;
  isActive: boolean;
  isPaused: boolean;
  isOpenNow: boolean;
  opensAt: string | null;
  activeOfferCount: number;
}

export interface BranchInput {
  name: string;
  cityId: string;
  suburbId?: string | null;
  address: string;
  landmark?: string | null;
  lat: number;
  lng: number;
  phone?: string | null;
  operatingHours?: OperatingHours;
  defaultPrepTimeMins?: number;
}

export interface Balances {
  available: Money;
  pending: Money;
  inPayout: Money;
  lifetime: { sales: Money; commission: Money; fulfilmentFees: Money; shipping: Money; net: Money; paidOut: Money };
  holdDays: number;
  /** Escrow after delivery, hours */
  holdHours: number;
}

export interface MerchantDashboard {
  seller: { businessName: string; kycStatus: SellerProfile['kycStatus']; plan: string; slaScore: number; ratingAvg: number; ratingCount: number; isFirstParty: boolean };
  balances: Balances;
  tasks: { toDispatch: number; overdue: number; inTransit: number; inboundOpen: number };
  offers: { active: number; outOfStock: number; lowStock: number; buyBoxWins: number };
  requests: { pending: number; readyToList: number };
  last30Days: { orderLines: number; units: number; sales: Money };
}

export interface MyOffer {
  id: string;
  product: { id: string; sku: string; slug: string; title: string; image: string | null };
  sellerSku: string | null;
  price: Money;
  listPrice: Money | null;
  shippingFee: Money;
  stockQty: number;
  fulfilmentType: FulfilmentMethod;
  hub: { id: string; code: string; name: string } | null;
  branch: { id: string; code: string; name: string } | null;
  prepTimeMins: number;
  dispatchCity: string | null;
  leadTimeDays: number;
  isActive: boolean;
  isBuyBoxWinner: boolean;
  buyBoxPrice: Money | null;
  eligibility: 'ELIGIBLE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'SELLER_NOT_APPROVED' | 'MISSING_HUB' | 'HUBS_DISABLED' | 'NO_BRANCH' | 'BRANCH_UNAVAILABLE';
}

export interface SellerShipment {
  id: string;
  reference: string;
  status: string;
  tierLabel: string;
  dispatchBy: string | null;
  overdue: boolean;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  dispatchedOnTime: boolean | null;
  courierName: string | null;
  trackingNumber: string | null;
  shippingFeeUsd: number;
  order: {
    id: string;
    reference: string;
    deliveryMode: 'DELIVERY' | 'PICKUP';
    address: Record<string, string | null>;
    pickupPoint: { name: string; address: string } | null;
    recipientName: string;
    recipientPhone: string;
    notes: string | null;
  };
  items: { id: string; title: string; sku: string; sellerSku: string | null; quantity: number; lineTotalUsd: number; sellerNetUsd: number }[];
}

export interface InboundNotice {
  id: string;
  reference: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RECEIVED' | 'CANCELLED';
  hub: { id: string; code: string; name: string; address: string; city: string };
  seller: { id: string; name: string };
  expectedArrival: string | null;
  carrier: string | null;
  notes: string | null;
  receivingNotes: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  totals: { expected: number; received: number; damaged: number; shortfall: number };
  items: { id: string; offerId: string; title: string; sku: string; image: string | null; quantityExpected: number; quantityReceived: number | null; quantityDamaged: number }[];
}

export interface Payout {
  id: string;
  reference: string;
  currency: 'USD' | 'ZWG';
  method: 'USD_BANK' | 'ZWG_BANK' | 'ECOCASH_MERCHANT';
  amountUsd: number;
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
  externalRef: string | null;
  note: string | null;
  createdAt: string;
}

export interface StatementEntry {
  id: string;
  date: string;
  type: string;
  label: string;
  memo: string | null;
  orderReference: string | null;
  currency: 'USD' | 'ZWG';
  grossUsd: number;
  grossTx: number;
  commissionUsd: number;
  fulfilmentFeeUsd: number;
  netUsd: number;
  balanceUsd: number;
}

export interface Hub {
  id: string;
  code: string;
  name: string;
  address: string;
  city: { id: string; name: string; slug: string };
}

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await api.get(url, { params })).data.data as T;

/** null when the user hasn't set up a seller account yet */
export const useMySellerProfile = () =>
  useQuery({
    queryKey: ['merchant', 'profile'],
    retry: false,
    queryFn: async () => {
      try {
        return await get<SellerProfile>('/sellers/me');
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
  });

export const useMerchantDashboard = (enabled = true) =>
  useQuery({ queryKey: ['merchant', 'dashboard'], enabled, queryFn: () => get<MerchantDashboard>('/merchant/dashboard') });
export const useMyOffers = () => useQuery({ queryKey: ['merchant', 'offers'], queryFn: () => get<MyOffer[]>('/offers/mine') });
export const useSellerShipments = (tab: string) =>
  useQuery({ queryKey: ['merchant', 'shipments', tab], queryFn: () => get<SellerShipment[]>('/merchant/shipments', { tab }) });
export const useInbound = () => useQuery({ queryKey: ['merchant', 'inbound'], queryFn: () => get<InboundNotice[]>('/merchant/inbound') });
export const useBalances = () => useQuery({ queryKey: ['merchant', 'balances'], queryFn: () => get<Balances>('/merchant/balances') });
export const usePayouts = () => useQuery({ queryKey: ['merchant', 'payouts'], queryFn: () => get<Payout[]>('/merchant/payouts') });
export const useStatement = () =>
  useQuery({ queryKey: ['merchant', 'statement'], queryFn: () => get<{ openingBalanceUsd: number; closingBalanceUsd: number; entries: StatementEntry[] }>('/merchant/statement') });
export const useMyBranches = (enabled = true) =>
  useQuery({ queryKey: ['merchant', 'branches'], enabled, queryFn: () => get<StoreBranch[]>('/merchant/branches') });
export const useMyBranch = (id?: string) =>
  useQuery({ queryKey: ['merchant', 'branches', id], enabled: !!id, queryFn: () => get<StoreBranch>(`/merchant/branches/${id}`) });
export const useHubs = () => useQuery({ queryKey: ['logistics', 'hubs'], staleTime: 10 * 60 * 1000, queryFn: () => get<Hub[]>('/logistics/hubs') });

/** POST/PATCH helper that refreshes every seller-portal query afterwards */
function useMerchantMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export const useOnboardSeller = () =>
  useMerchantMutation((dto: { businessName: string; kycTier: 'INFORMAL' | 'REGISTERED'; taxNumber?: string; nationalId?: string; phone: string; cityId: string; description?: string }) =>
    api.post('/sellers/onboard', dto).then((r) => r.data.data as SellerProfile));
export const useUpdateSellerProfile = () =>
  useMerchantMutation((dto: Partial<Pick<SellerProfile, 'usdPayoutDetails' | 'zigPayoutDetails' | 'leadTimeDays' | 'description'>> & { phone?: string }) =>
    api.patch('/sellers/me', dto).then((r) => r.data.data));
export const useCreateBranch = () =>
  useMerchantMutation((dto: BranchInput) => api.post('/merchant/branches', dto).then((r) => r.data.data as StoreBranch));
export const useUpdateBranch = () =>
  useMerchantMutation(({ id, ...dto }: Partial<BranchInput> & { id: string; isPaused?: boolean; isActive?: boolean }) =>
    api.patch(`/merchant/branches/${id}`, dto).then((r) => r.data.data as StoreBranch));
export const useCreateOffer = () =>
  useMerchantMutation((dto: { productId: string; priceUsd: number; listPriceUsd?: number; shippingFeeUsd?: number; stockQty?: number; fulfilmentType: FulfilmentMethod; hubId?: string; storeBranchId?: string; prepTimeMins?: number; leadTimeDays?: number; sellerSku?: string }) =>
    api.post('/offers', dto).then((r) => r.data.data));
export const useUpdateOffer = () =>
  useMerchantMutation(({ id, ...dto }: { id: string; priceUsd?: number; listPriceUsd?: number | null; shippingFeeUsd?: number; stockQty?: number; leadTimeDays?: number; prepTimeMins?: number; isActive?: boolean }) =>
    api.patch(`/offers/${id}`, dto).then((r) => r.data.data));
export const useShipmentAction = () =>
  useMerchantMutation(({ id, action, body }: { id: string; action: 'pack' | 'dispatch' | 'deliver'; body?: Record<string, string | undefined> }) =>
    api.post(`/merchant/shipments/${id}/${action}`, body ?? {}).then((r) => r.data.data as SellerShipment));
export const useCreateInbound = () =>
  useMerchantMutation((dto: { hubId: string; expectedArrival?: string; carrier?: string; notes?: string; items: { offerId: string; quantity: number }[] }) =>
    api.post('/merchant/inbound', dto).then((r) => r.data.data as InboundNotice));
export const useInboundAction = () =>
  useMerchantMutation(({ id, action }: { id: string; action: 'submit' | 'cancel' }) =>
    api.post(`/merchant/inbound/${id}/${action}`).then((r) => r.data.data as InboundNotice));
export const useRequestPayout = () =>
  useMerchantMutation((dto: { currency: 'USD' | 'ZWG'; amountUsd?: number }) => api.post('/merchant/payouts', dto).then((r) => r.data.data as Payout));

/** The statement as CSV text (the endpoint needs the auth header, so it can't be a plain link) */
export const fetchStatementCsv = async () => (await api.get('/merchant/statement.csv', { responseType: 'text' })).data as string;

// ── Product requests (asking Kuwana to add a product to the catalog) ──

export type ProductRequestStatus = 'PENDING' | 'APPROVED' | 'DUPLICATE' | 'REJECTED' | 'CANCELLED';

export interface ProductRequest {
  id: string;
  status: ProductRequestStatus;
  title: string;
  brandName: string | null;
  category: { id: string; name: string } | null;
  description: string | null;
  barcode: string | null;
  referenceUrl: string | null;
  images: { url: string; alt?: string }[];
  specifications: Record<string, string | number | boolean>;
  weightKg: number | null;
  note: string | null;
  product: { id: string; slug: string; sku: string; title: string; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' } | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ProductRequestInput {
  title: string;
  brandName?: string;
  categoryId?: string;
  description?: string;
  barcode?: string;
  referenceUrl?: string;
  images: { url: string; alt?: string }[];
  specifications: Record<string, string>;
  weightKg?: number;
  note?: string;
}

export const useMyProductRequests = () =>
  useQuery({ queryKey: ['merchant', 'product-requests'], queryFn: () => get<ProductRequest[]>('/merchant/product-requests') });
export const useCreateProductRequest = () =>
  useMerchantMutation((dto: ProductRequestInput) => api.post('/merchant/product-requests', dto).then((r) => r.data.data as ProductRequest));
export const useCancelProductRequest = () =>
  useMerchantMutation((id: string) => api.post(`/merchant/product-requests/${id}/cancel`).then((r) => r.data.data as ProductRequest));
