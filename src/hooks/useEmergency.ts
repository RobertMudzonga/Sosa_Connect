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
      return data as EmergencyContact[];
    },
  });
};
