import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'buyer' | 'seller';

interface AppState {
  mode: AppMode;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  setMode: (mode: AppMode) => void;
  setLocation: (location: AppState['location']) => void;
  toggleMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'buyer',
      location: null,
      setMode: (mode) => set({ mode }),
      setLocation: (location) => set({ location }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'buyer' ? 'seller' : 'buyer' })),
    }),
    {
      name: 'sosa-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
