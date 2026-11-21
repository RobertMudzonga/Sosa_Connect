import type { ProductRequestStatus } from '@/src/hooks/useMerchant';

export const REQUEST_STATUS: Record<ProductRequestStatus, { label: string; tone?: 'good' | 'warn' | 'bad' | 'info' }> = {
  PENDING: { label: 'Waiting for review', tone: 'warn' },
  APPROVED: { label: 'Added', tone: 'good' },
  DUPLICATE: { label: 'Already in catalog', tone: 'info' },
  REJECTED: { label: 'Declined', tone: 'bad' },
  CANCELLED: { label: 'Cancelled' },
};
