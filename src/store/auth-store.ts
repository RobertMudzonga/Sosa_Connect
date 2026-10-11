import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'PROVIDER' | 'DRIVER' | 'ADMIN';
  phone?: string;
  phoneVerified?: boolean;
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  /** True once Zustand has finished reading persisted state from storage */
  _hydrated: boolean;
  setAuth: (token: string, refreshToken: string, user: UserProfile) => void;
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      _hydrated: false,
      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null }),
      isAuthenticated: () => !!get().token && !!get().user,
      _setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: 'kuwana-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Fired once AsyncStorage/localStorage has been read and state is merged in
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    }
  )
);
