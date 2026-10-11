import { palette } from '../theme/colors';
import type { FulfilmentType, OrderStatus, PaymentMethod } from '../hooks/useOrders';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Order placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COLLECTED: 'Collected',
  CANCELLED: 'Cancelled',
  REJECTED: 'Declined by seller',
  REFUNDED: 'Refunded',
};

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'DELIVERED':
    case 'COLLECTED':
      return palette.success;
    case 'CANCELLED':
    case 'REJECTED':
    case 'REFUNDED':
      return palette.danger;
    case 'PENDING_PAYMENT':
      return palette.warning;
    default:
      return palette.info;
  }
};

/** The happy-path steps shown as a timeline on the order screen */
export const getTimelineSteps = (fulfilment: FulfilmentType): OrderStatus[] =>
  fulfilment === 'DELIVERY'
    ? ['PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED']
    : ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COLLECTED'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ECOCASH: 'EcoCash',
  ONEMONEY: 'OneMoney',
  CARD: 'Card (Visa / Mastercard)',
  CASH: 'Cash on delivery',
};

/** Statuses from which a buyer may still cancel */
export const BUYER_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'PLACED'];
