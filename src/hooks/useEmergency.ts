import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface EmergencyContact {
  id: string;
  label: string;
  phone: string;
  category: string;
  description?: string;
  city?: string;
}

export const useEmergencyContacts = (city?: string) => {
  return useQuery({
    queryKey: ['emergency-contacts', city],
    queryFn: async () => {
      const { data } = await api.get('/emergency', { params: { city } });
      return data.data as EmergencyContact[];
    },
  });
};

export interface EmergencyAlertInput {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

/** Records the alert with Kuwana's team (they are notified by push). This does NOT contact public emergency services. */
export const sendEmergencyAlert = async (input: EmergencyAlertInput) => {
  const { data } = await api.post('/emergency/alerts', input, { timeout: 8000 });
  return data.data as { id: string };
};

/** National emergency number, used when the server's contact list hasn't loaded (e.g. no signal) */
export const FALLBACK_EMERGENCY_NUMBER = '999';
