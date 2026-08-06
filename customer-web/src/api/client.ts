// Minimal API client. Relative base by default so the Vite dev proxy and the
// production nginx (both proxy /api) work with no CORS. Unwraps the { success,
// data, message } envelope the backend returns.
export const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const body = await res.json();
  if (body && typeof body === "object" && "data" in body) return body.data as T;
  return body as T;
}

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && typeof body === "object" && "message" in body && (body as { message?: string }).message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  if (body && typeof body === "object" && "data" in body) return (body as { data: T }).data;
  return body as T;
}
