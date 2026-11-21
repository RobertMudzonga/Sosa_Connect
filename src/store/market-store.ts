import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ISO code; shown to people as "ZiG" */
export type DisplayCurrency = 'USD' | 'ZWG';

export interface BuyerCity {
  slug: string;
  name: string;
}

interface MarketState {
  /** Currency prices are displayed in. Prices always arrive in both, so switching is instant. */
  currency: DisplayCurrency;
  /** Where the buyer wants delivery. Stores are ranked by distance from here. null = nationwide view. */
  city: BuyerCity | null;
  /** Optional suburb within the city (more precise distance than the city centre) */
  suburb: { id: string; name: string } | null;
  /** Optional GPS pin from "use my location" (most precise) */
  pin: { lat: number; lng: number } | null;
  setCurrency: (currency: DisplayCurrency) => void;
  toggleCurrency: () => void;
  /** Changing city clears the suburb and pin */
  setCity: (city: BuyerCity | null) => void;
  setSuburb: (suburb: MarketState['suburb']) => void;
  /** Set city and GPS pin together (from the device location) */
  setPin: (city: BuyerCity, pin: { lat: number; lng: number }) => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      currency: 'USD',
      city: null,
      suburb: null,
      pin: null,
      setCurrency: (currency) => set({ currency }),
      toggleCurrency: () => set((s) => ({ currency: s.currency === 'USD' ? 'ZWG' : 'USD' })),
      setCity: (city) => set({ city, suburb: null, pin: null }),
      setSuburb: (suburb) => set({ suburb, pin: null }),
      setPin: (city, pin) => set({ city, pin, suburb: null }),
    }),
    {
      name: 'kuwana-market',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Buyer location as catalog query params: city slug, suburb id and/or GPS pin */
export interface LocationParams {
  city?: string;
  suburb?: string;
  lat?: number;
  lng?: number;
}

export function useBuyerLocation(): LocationParams {
  const city = useMarketStore((s) => s.city);
  const suburb = useMarketStore((s) => s.suburb);
  const pin = useMarketStore((s) => s.pin);
  return {
    city: city?.slug,
    suburb: suburb?.id,
    lat: pin?.lat,
    lng: pin?.lng,
  };
}

/** "Avondale, Harare" / "Your location, Harare" / "Harare" */
export function locationLabel(s: Pick<MarketState, 'city' | 'suburb' | 'pin'>): string | null {
  if (!s.city) return null;
  if (s.pin) return `Your location, ${s.city.name}`;
  if (s.suburb) return `${s.suburb.name}, ${s.city.name}`;
  return s.city.name;
}
