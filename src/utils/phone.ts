/** Normalise a Zimbabwean mobile number to +2637XXXXXXXX, or null if invalid */
export const normalizeZwPhone = (input: string) => {
  const digits = input.replace(/[^\d+]/g, '');
  if (/^07\d{8}$/.test(digits)) return `+263${digits.slice(1)}`;
  if (/^2637\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+2637\d{8}$/.test(digits)) return digits;
  return null;
};

export const isValidZwMobile = (input: string) => normalizeZwPhone(input) !== null;
