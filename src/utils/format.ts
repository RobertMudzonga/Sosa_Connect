export const formatMoney = (amount: number, currency = 'USD') =>
  `${currency} ${Number(amount || 0).toFixed(2)}`;

const twoDp = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format a dual-currency price for display: "$189.00" or "ZiG 5,055.75".
 * Falls back to USD if no ZiG amount is available (no exchange rate set yet).
 */
export const formatPrice = (price: { usd: number; zwg: number | null } | null | undefined, currency: 'USD' | 'ZWG') => {
  if (!price) return '';
  if (currency === 'ZWG' && price.zwg !== null) return `ZiG ${twoDp(price.zwg)}`;
  return `$${twoDp(price.usd)}`;
};

export const currencyLabel = (currency: 'USD' | 'ZWG') => (currency === 'ZWG' ? 'ZiG' : 'USD');

export const formatDateTime =(iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Pull a human-readable message out of an axios / API error. */
export const getErrorMessage = (error: any, fallback = 'Something went wrong. Please try again.') => {
  const body = error?.response?.data;
  // Validation errors: { message: 'Validation failed', errors: { field: ['problem', ...] } }
  if (body?.errors && typeof body.errors === 'object') {
    const details = Object.values(body.errors as Record<string, string[]>).flat().filter(Boolean);
    if (details.length) return details.join('\n');
  }
  if (Array.isArray(body?.message)) return body.message.join('\n');
  if (!error?.response && error?.message === 'Network Error') return 'Could not reach Kuwana. Check your connection.';
  return body?.message || error?.message || fallback;
};
