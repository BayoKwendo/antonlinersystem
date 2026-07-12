import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

// Same-origin by default: the portal is served behind a reverse proxy (Apache /
// nginx) that forwards /api to the backend, so a relative base works on any host
// without a rebuild. Set VITE_API_URL only for a cross-origin API (e.g. local dev
// hitting a remote server); an absolute value there is honored as-is.
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

// localStorage is the single source of truth for tokens (avoids store<->client
// import cycles); the auth store mirrors it for reactive UI.
export const tokens = {
  get access() {
    return localStorage.getItem("access_token");
  },
  get refresh() {
    return localStorage.getItem("refresh_token");
  },
  set({ access, refresh }: { access: string; refresh: string }) {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
};

export const http = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Single-flight refresh: queue requests while a refresh is in progress.
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const refresh = tokens.refresh;
  if (!refresh) return null;
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
    const data = res.data?.data;
    if (!data?.access_token) return null;
    tokens.set({ access: data.access_token, refresh: data.refresh_token });
    return data.access_token;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccess().finally(() => (refreshing = null));
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return http(original);
      }
      tokens.clear();
      if (location.pathname !== "/login") location.assign("/login");
    }
    return Promise.reject(error);
  },
);

/** Unwrap the API envelope `{ success, data, message }`. */
export async function unwrap<T>(p: Promise<{ data: { data: T; message?: string } }>): Promise<T> {
  const res = await p;
  return res.data.data;
}

export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) return e.response?.data?.message ?? e.message;
  return e instanceof Error ? e.message : "Unexpected error";
}
