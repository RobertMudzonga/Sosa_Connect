import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

export interface CartItem {
  /** Unique per service + chosen options + notes, so the same dish with different extras is a separate line */
  lineId: string;
  serviceId: string;
  title: string;
  /** Base price, excluding options */
  price: number;
  currency: string;
  quantity: number;
  providerId: string;
  providerName: string;
  imageUrl?: string;
  options: CartItemOption[];
  notes?: string;
}

export type NewCartItem = Omit<CartItem, 'quantity' | 'lineId' | 'options'> & {
  options?: CartItemOption[];
};

export const getUnitPrice = (item: Pick<CartItem, 'price' | 'options'>) =>
  item.price + item.options.reduce((sum, o) => sum + o.price, 0);

const buildLineId = (item: NewCartItem) => {
  const optionKey = (item.options ?? []).map((o) => o.optionId).sort().join(',');
  return [item.serviceId, optionKey, item.notes?.trim() ?? ''].join('|');
};

interface CartState {
  items: CartItem[];
  addItem: (item: NewCartItem, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  clearCart: () => void;
  /** Subtotals keyed by currency, since sellers may price in different currencies */
  getTotals: () => Record<string, number>;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => set((state) => {
        const lineId = buildLineId(item);
        const existing = state.items.find((i) => i.lineId === lineId);
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.lineId === lineId ? { ...i, quantity: i.quantity + quantity } : i
            ),
          };
        }
        return { items: [...state.items, { ...item, options: item.options ?? [], lineId, quantity }] };
      }),
      removeItem: (lineId) => set((state) => ({
        items: state.items.filter((i) => i.lineId !== lineId),
      })),
      updateQuantity: (lineId, delta) => set((state) => ({
        items: state.items.map((i) =>
          i.lineId === lineId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        ),
      })),
      clearCart: () => set({ items: [] }),
      getTotals: () => get().items.reduce<Record<string, number>>((totals, item) => {
        totals[item.currency] = (totals[item.currency] ?? 0) + getUnitPrice(item) * item.quantity;
        return totals;
      }, {}),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'kuwana-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
