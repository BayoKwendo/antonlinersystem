/** Strip anything that isn't a digit, +, or space (used to filter phone input). */
export function sanitizePhone(v: string): string {
  return v.replace(/[^\d+ ]/g, "");
}

/**
 * Validate a Kenyan mobile number. Accepts 2547XXXXXXXX / 07XXXXXXXX / 7XXXXXXXX
 * (and the 1-prefixed Safaricom range). Returns an error string or null.
 */
export function validatePhone(v: string | undefined | null): string | null {
  const digits = (v ?? "").replace(/\D/g, "");
  if (!digits) return "Phone number is required";
  if (!/^(254|0)?[17]\d{8}$/.test(digits)) return "Enter a valid phone number";
  return null;
}

/** Same as validatePhone but allows empty (for optional phone fields). */
export function validatePhoneOptional(v: string | undefined | null): string | null {
  if (!v || !v.trim()) return null;
  return validatePhone(v);
}
