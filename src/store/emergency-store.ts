import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

interface EmergencyState {
  /** People who get an SMS with your location when you trigger SOS. Kept on-device so it works offline. */
  contacts: TrustedContact[];
  addContact: (contact: Omit<TrustedContact, 'id'>) => void;
  removeContact: (id: string) => void;
}

export const useEmergencyStore = create<EmergencyState>()(
  persist(
    (set) => ({
      contacts: [],
      addContact: (contact) => set((state) => ({
        contacts: [...state.contacts, { ...contact, id: `${Date.now()}` }],
      })),
      removeContact: (id) => set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) })),
    }),
    {
      name: 'kuwana-emergency-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
