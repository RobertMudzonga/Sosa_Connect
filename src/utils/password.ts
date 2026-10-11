/** Mirrors the server's password rules so problems show before submitting */
export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter and a number';

export const getPasswordProblem = (password: string): string | null => {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Include at least one number.';
  return null;
};
