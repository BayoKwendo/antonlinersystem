import { getJson } from "./client";

/** A service as returned by GET /api/v1/services. */
export interface ApiService {
  id: number;
  key: string;
  name: string;
  description: string | null;
  price: string | null;
  price_unit: string | null;
  price_note: string | null;
  pricing_mode: "fixed" | "quote";
  icon: string | null;
  cta_label: string | null;
  accent: string | null;
  sort_order: number;
}

export const fetchServices = () => getJson<ApiService[]>("/services");
