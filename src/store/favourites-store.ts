import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../components/common/ProductCard';
import type { Service } from '../hooks/useServices';
import { api } from '../services/api';
import { useAuthStore } from './auth-store';
import { toProduct } from '../utils/product';

interface FavouritesState {
  /** Local cache; the server is the source of truth once signed in */
  items: Product[];
  toggle: (product: Product) => void;
  setItems: (items: Product[]) => void;
  isFavourite: (id: string) => boolean;
}

const isSignedIn = () => !!useAuthStore.getState().token;

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some((p) => p.id === product.id);
        // Optimistic update, rolled back if the server rejects it
        const previous = get().items;
        set({ items: exists ? previous.filter((p) => p.id !== product.id) : [product, ...previous] });
        if (!isSignedIn()) return;
        const request = exists
          ? api.delete(`/favourites/${product.id}`)
          : api.post('/favourites', { serviceId: product.id });
        request.catch(() => set({ items: previous }));
      },
      setItems: (items) => set({ items }),
      isFavourite: (id) => get().items.some((p) => p.id === id),
    }),
    {
      name: 'kuwana-favourites-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/**
 * On sign-in: upload favourites saved while signed out, then replace the local
 * cache with the server list (so favourites follow the user across devices).
 */
export const useFavouritesSync = () => {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/favourites');
        const serverItems = (data.data as Service[]).map(toProduct);
        const serverIds = new Set(serverItems.map((p) => p.id));
        const localOnly = useFavouritesStore.getState().items.filter((p) => !serverIds.has(p.id));
        await Promise.allSettled(localOnly.map((p) => api.post('/favourites', { serviceId: p.id })));
        if (!cancelled) useFavouritesStore.getState().setItems([...localOnly, ...serverItems]);
      } catch {
        // Keep the local cache if the server is unreachable
      }
    })();
    return () => { cancelled = true; };
  }, [token]);
};
