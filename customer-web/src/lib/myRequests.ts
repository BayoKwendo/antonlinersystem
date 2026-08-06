// =============================================================================
//  Local record of the requests submitted from this device. The read-only
//  tracking token is the key to /track/:token, so we persist it here to give
//  the customer a way back to their order after they leave the site. This is a
//  convenience cache only — the SMS also carries the link, and the backend
//  remains the source of truth.
// =============================================================================
export interface SavedRequest {
  requestNo: string;
  token: string;
  service: string;
  serviceKey?: string;
  ts: number; // submission time (epoch ms)
}

const KEY = "sd_requests";
const MAX = 12;

export function getRequests(): SavedRequest[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveRequest(r: SavedRequest): void {
  try {
    const list = getRequests().filter((x) => x.token !== r.token);
    list.unshift(r);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable (private mode / disabled) — non-fatal */
  }
}

export function removeRequest(token: string): SavedRequest[] {
  const list = getRequests().filter((x) => x.token !== token);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* non-fatal */
  }
  return list;
}

export function latestRequest(): SavedRequest | null {
  return getRequests()[0] ?? null;
}
