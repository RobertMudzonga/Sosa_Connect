import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** One marketplace cart line = one seller's offer. Prices are re-checked by the server quote. */
export interface MarketCartLine {
  offerId: string;
  productId: string;
  slug: string;
  title: string;
  image?: string | null;
  sellerName: string;
  quantity: number;
  /** Price when added; the server quote is the source of truth */
  unitPriceUsd: number;
}

export const MAX_LINE_QUANTITY = 99;

interface MarketCartState {
  lines: MarketCartLine[];
  add: (line: Omit<MarketCartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (offerId: string, quantity: number) => void;
  remove: (offerId: string) => void;
  /** Remove the lines that were just ordered */
  removeOffers: (offerIds: string[]) => void;
  clear: () => void;
}

export const useMarketCartStore = create<MarketCartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.offerId === line.offerId);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.offerId === line.offerId ? { ...l, ...line, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }] };
        }),
      setQuantity: (offerId, quantity) =>
        set((s) => ({
          lines: quantity <= 0
            ? s.lines.filter((l) => l.offerId !== offerId)
            : s.lines.map((l) => (l.offerId === offerId ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : l)),
        })),
      remove: (offerId) => set((s) => ({ lines: s.lines.filter((l) => l.offerId !== offerId) })),
      removeOffers: (offerIds) => set((s) => ({ lines: s.lines.filter((l) => !offerIds.includes(l.offerId)) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'kuwana-market-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const marketCartCount = (lines: MarketCartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
