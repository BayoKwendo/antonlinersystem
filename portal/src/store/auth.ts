import { create } from "zustand";
import { api } from "../api/endpoints";
import { tokens } from "../api/client";
import type { Role, User } from "../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

function loadUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: loadUser(),
  loading: false,

  async login(phone, password) {
    const res = await api.login(phone, password);
    tokens.set({ access: res.access_token, refresh: res.refresh_token });
    localStorage.setItem("user", JSON.stringify(res.user));
    set({ user: res.user });
  },

  async logout() {
    try {
      if (tokens.refresh) await api.logout(tokens.refresh);
    } catch { /* ignore */ }
    tokens.clear();
    set({ user: null });
  },

  // Re-validate the session on app load (token may have expired).
  async hydrate() {
    if (!tokens.access) return;
    set({ loading: true });
    try {
      const me = await api.me();
      localStorage.setItem("user", JSON.stringify(me));
      set({ user: me });
    } catch {
      tokens.clear();
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  hasRole(...roles) {
    const u = get().user;
    return !!u && u.roles.some((r) => roles.includes(r));
  },
}));
