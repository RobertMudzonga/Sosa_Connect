import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../services/api';
import type { DisplayCurrency, LocationParams } from '../store/market-store';

/** A price in both currencies. USD is the source of truth; zwg is null until an exchange rate is set. */
export interface Money {
  usd: number;
  zwg: number | null;
}

export interface ExchangeRate {
  from: 'USD';
  to: 'ZWG';
  rate: number;
  effectiveFrom: string;
}

export type FulfilmentMethod = 'PLATFORM_FULFILLED' | 'SELLER_FULFILLED';

export interface CatalogListItem {
  id: string;
  sku: string;
  slug: string;
  title: string;
  brand: { name: string; slug: string } | null;
  category: { id: string; name: string; slug: string };
  image: { url: string; thumbUrl: string; alt?: string | null } | null;
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  offerCount: number;
  price: Money | null;
  listPrice: Money | null;
  buyBox: {
    offerId: string;
    sellerName: string;
    isFirstParty: boolean;
    fulfilmentType: FulfilmentMethod;
    branch: { suburb: string | null; city: string } | null;
    /** Only with a buyer location */
    distanceKm: number | null;
    isOpenNow: boolean | null;
    etaMinutes: number | null;
    deliveryFee: Money | null;
    availability: string;
  } | null;
}

export interface BuyerLocationEcho {
  city: { id: string; name: string; slug: string } | null;
  suburb: { id: string; name: string } | null;
  precision: 'GPS' | 'SUBURB' | 'CITY' | 'NONE';
}

export interface FacetOption {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface SearchFacets {
  brands: FacetOption[];
  categories: FacetOption[];
  fulfilment: { value: FulfilmentMethod; label: string; count: number }[];
  cities: FacetOption[];
  price: { min: Money | null; max: Money | null };
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

export interface CatalogSearchParams {
  q?: string;
  category?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** Currency the min/max price were typed in */
  currency?: DisplayCurrency;
  /** Buyer location: only products a store can deliver there, ranked for that buyer */
  city?: string;
  suburb?: string;
  lat?: number;
  lng?: number;
  fulfilment?: FulfilmentMethod;
  inStock?: boolean;
  sort?: SortOption;
}

interface SearchPage {
  data: CatalogListItem[];
  meta: { page: number; total: number; hasNext: boolean };
  facets: SearchFacets;
  exchangeRate: ExchangeRate | null;
  buyerLocation: BuyerLocationEcho | null;
}

export interface CatalogOffer {
  id: string;
  isBuyBoxWinner: boolean;
  seller: { id: string; name: string; slug: string; isFirstParty: boolean; ratingAvg: number; ratingCount: number; slaScore: number };
  /** Store branch holding the stock */
  branch: { id: string; code: string; name: string; suburb: string | null; city: string; landmark: string | null } | null;
  price: Money;
  listPrice: Money | null;
  shippingFee: Money;
  /** Estimated delivery to the buyer (null without a location) */
  deliveryFee: Money | null;
  /** Price + delivery estimate */
  landedPrice: Money;
  distanceKm: number | null;
  etaMinutes: number | null;
  isOpenNow: boolean | null;
  opensAt: string | null;
  prepTimeMins: number;
  fulfilmentType: FulfilmentMethod;
  hub: { code: string; name: string; city: string } | null;
  stockQty: number;
  lowStock: boolean;
  proximity: 'SAME_CITY' | 'OTHER_CITY' | null;
  availability: string;
}

export type VehicleClass = 'BIKE' | 'CAR' | 'BAKKIE';

export interface CatalogProduct {
  id: string;
  sku: string;
  /** Present for admins viewing any status */
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  categoryId?: string;
  weightKg?: number | null;
  slug: string;
  title: string;
  description: string | null;
  brand: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  breadcrumb: { id: string; name: string; slug: string }[];
  specifications: Record<string, string | number | boolean>;
  images: { url: string; thumbUrl: string; alt?: string | null }[];
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  buyBox: CatalogOffer | null;
  otherOffers: CatalogOffer[];
  outOfStockOfferCount: number;
  /** In-stock offers from stores too far away to deliver to the buyer */
  outOfRangeOfferCount: number;
  vehicleClass: VehicleClass;
  /** Admin editor: the product's own override (null = inherits the category's) */
  vehicleClassOverride?: VehicleClass | null;
  buyerCity: { id: string; name: string; slug: string } | null;
  buyerLocation: BuyerLocationEcho | null;
  exchangeRate: ExchangeRate | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
  commissionRate: number;
  fulfilmentFeeUsd: number;
  requiredVehicleClass: VehicleClass;
  isReturnable: boolean;
  children: CategoryNode[];
}

export interface City {
  id: string;
  name: string;
  slug: string;
  province: string;
  zone: 'METRO' | 'INTERCITY';
  codEligible: boolean;
  lat: number | null;
  lng: number | null;
  suburbs: { id: string; name: string }[];
}

const PAGE_SIZE = 20;
/** Reference data changes rarely; keep it for a while to save data on slow connections */
const REFERENCE_STALE_MS = 10 * 60 * 1000;

export const useExchangeRate = () =>
  useQuery({
    queryKey: ['currency', 'rate'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get('/currency/rate');
      return data.data as ExchangeRate | null;
    },
  });

export const useCategoryTree = () =>
  useQuery({
    queryKey: ['catalog', 'categories'],
    staleTime: REFERENCE_STALE_MS,
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories');
      return data.data as CategoryNode[];
    },
  });

export const useCities = () =>
  useQuery({
    queryKey: ['logistics', 'cities'],
    staleTime: REFERENCE_STALE_MS,
    queryFn: async () => {
      const { data } = await api.get('/logistics/cities');
      return data.data as City[];
    },
  });

function toQuery(params: CatalogSearchParams) {
  return {
    q: params.q || undefined,
    category: params.category,
    brand: params.brand?.length ? params.brand.join(',') : undefined,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    currency: params.minPrice !== undefined || params.maxPrice !== undefined ? params.currency : undefined,
    city: params.city,
    suburb: params.suburb,
    lat: params.lat,
    lng: params.lng,
    fulfilment: params.fulfilment,
    inStock: params.inStock ? 'true' : undefined,
    sort: params.sort,
  };
}

/** Paged product search; keeps the previous results on screen while filters change */
export const useCatalogSearch = (params: CatalogSearchParams, options?: { enabled?: boolean; limit?: number }) =>
  useInfiniteQuery({
    queryKey: ['catalog', 'search', params, options?.limit ?? PAGE_SIZE],
    enabled: options?.enabled ?? true,
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/catalog/products', {
        params: { ...toQuery(params), page: pageParam, limit: options?.limit ?? PAGE_SIZE },
      });
      return data as SearchPage;
    },
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
  });

export const useCatalogProduct = (idOrSlug?: string, location?: LocationParams) =>
  useQuery({
    queryKey: ['catalog', 'product', idOrSlug, location ?? null],
    enabled: !!idOrSlug,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.get(`/catalog/products/${idOrSlug}`, { params: location });
      return data.data as CatalogProduct;
    },
  });
