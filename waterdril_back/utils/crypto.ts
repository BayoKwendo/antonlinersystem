// =============================================================================
//  Small crypto helpers (Web Crypto / Deno std).
// =============================================================================

/** Hex-encode bytes. */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 of a string, hex-encoded (used to store refresh tokens / OTPs). */
export async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/** A cryptographically-random opaque token (hex), default 32 bytes. */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

/** A numeric OTP code of `length` digits (zero-padded). */
export function randomOtp(length: number): string {
  const max = 10 ** length;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % max).padStart(length, "0");
}
