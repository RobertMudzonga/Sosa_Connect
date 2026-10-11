export const formatMoney = (amount: number, currency = 'USD') =>
  `${currency} ${Number(amount || 0).toFixed(2)}`;

export const formatDateTime = (iso?: string) => {
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
