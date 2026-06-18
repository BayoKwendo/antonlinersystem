// =============================================================================
//  Phone normalization to Kenyan MSISDN form (2547XXXXXXXX / 2541XXXXXXXX).
// =============================================================================
export function normalizePhone(input: string): string {
  let p = (input ?? "").replace(/[\s+\-()]/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  else if (p.startsWith("254")) { /* already normalized */ }
  return p;
}

/** True for a plausible normalized MSISDN (2547******** / 2541********). */
export function isValidMsisdn(p: string): boolean {
  return /^254[17]\d{8}$/.test(p);
}
